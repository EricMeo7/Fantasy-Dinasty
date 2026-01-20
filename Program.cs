using FantasyBasket.API.Common.Behaviors;
using FluentValidation;
using MediatR;
using FantasyBasket.API.Data;
using FantasyBasket.API.Hubs;
using FantasyBasket.API.Interfaces;
using FantasyBasket.API.Models;
using FantasyBasket.API.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Text.Json.Serialization;

using Polly;
using Polly.Extensions.Http;

var builder = WebApplication.CreateBuilder(args);
AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

// ==========================================
// 1. CONFIGURAZIONE DEI SERVIZI
// ==========================================

// Database
// Database
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"),
    o => o.UseQuerySplittingBehavior(QuerySplittingBehavior.SplitQuery))
    );

// Identity
builder.Services.AddIdentity<ApplicationUser, IdentityRole>(options =>
{
    options.Password.RequireDigit = true;
    options.Password.RequiredLength = 8;
    options.Password.RequireNonAlphanumeric = true;
    options.Password.RequireUppercase = true;
})
.AddEntityFrameworkStores<ApplicationDbContext>()
.AddErrorDescriber<LocalizedIdentityErrorDescriber>()
.AddDefaultTokenProviders();

// JWT Authentication
var jwtKey = builder.Configuration["Jwt:Key"] ?? throw new InvalidOperationException("JWT Key mancante");
var key = Encoding.ASCII.GetBytes(jwtKey);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidateAudience = true,
        ValidAudience = builder.Configuration["Jwt:Audience"],
        ClockSkew = TimeSpan.Zero
    };

    // FONDAMENTALE PER SIGNALR: Legge il token dalla query string
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/drafthub"))
            {
                context.Token = accessToken;
            }
            return Task.CompletedTask;
        }
    };
});

// --- AGGIUNTA FONDAMENTALE PER L'ERRORE ---
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy =>
        policy.RequireClaim("IsAdmin", "true")); // Definisce la regola per l'Admin
});
// -------------------------------------------

// CORS
builder.Services.AddCors(options =>
{
    var allowedOrigins = builder.Configuration.GetSection("AllowedOrigins").Get<string[]>();
    
    // FALLBACK: Se non c'è appsettings (es. produzione senza file/env), usiamo i default sicuri
    if (allowedOrigins == null || !allowedOrigins.Any())
    {
        allowedOrigins = new[] 
        { 
            "https://fantasy-dinasty.pages.dev",
            "capacitor://localhost",
            "http://localhost:5173"
        };
    }
    options.AddPolicy("AllowReactApp",
        builder => builder
            .WithOrigins(allowedOrigins)
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials());
});

// Servizi Applicativi
builder.Services.AddScoped<AuctionService>();
builder.Services.AddScoped<MatchupService>();
builder.Services.AddScoped<ScheduleService>();
builder.Services.AddSingleton<LiveDraftService>();
builder.Services.AddScoped<OfficialInjuryService>();
builder.Services.AddScoped<OfficialInjuryService>();

if (builder.Environment.IsDevelopment())
{
    builder.Services.AddSingleton<IEmailService, ConsoleMockEmailService>();
}
else
{
    // In Produzione usiamo il NoOp per evitare leak di token nei log, finché non si configura SMTP
    builder.Services.AddSingleton<IEmailService, ProductionNoOpEmailService>();
}

// --- 1. MEMORY CACHE ---
builder.Services.AddMemoryCache();

// --- 2. POLLY POLICIES ---
var retryPolicy = Policy.Handle<HttpRequestException>()
    .OrResult<HttpResponseMessage>(r => !r.IsSuccessStatusCode && r.StatusCode != System.Net.HttpStatusCode.NotFound)
    .WaitAndRetryAsync(3, retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)));

var circuitBreakerPolicy = Policy.Handle<HttpRequestException>()
    .OrResult<HttpResponseMessage>(r => !r.IsSuccessStatusCode)
    .CircuitBreakerAsync(5, TimeSpan.FromMinutes(1));

// --- 3. HTTP CLIENTS CONFIG ---
builder.Services.AddHttpClient("NbaStats", client =>
{
    client.Timeout = TimeSpan.FromSeconds(120);
    client.BaseAddress = new Uri("https://stats.nba.com/stats/");
    // client.DefaultRequestHeaders.Add("Host", "stats.nba.com"); // Rimuoviamo Host manuale per evitare conflitti SNI
    client.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36");
    client.DefaultRequestHeaders.Add("Accept-Language", "en-US,en;q=0.9");
    client.DefaultRequestHeaders.Add("Accept", "application/json, text/plain, */*");
    client.DefaultRequestHeaders.Add("Referer", "https://www.nba.com/");
    client.DefaultRequestHeaders.Add("Origin", "https://www.nba.com");
    // client.DefaultRequestHeaders.Add("Connection", "keep-alive"); // HttpClient gestisce questo automaticamente in 2.0
    client.DefaultRequestHeaders.Add("x-nba-stats-origin", "stats");
    client.DefaultRequestHeaders.Add("x-nba-stats-token", "true");
    
    // Browser mimic headers
    client.DefaultRequestHeaders.Add("Sec-Ch-Ua", "\"Not(A:Brand\";v=\"99\", \"Google Chrome\";v=\"142\", \"Chromium\";v=\"142\"");
    client.DefaultRequestHeaders.Add("Sec-Ch-Ua-Mobile", "?0");
    client.DefaultRequestHeaders.Add("Sec-Ch-Ua-Platform", "\"Windows\"");
    client.DefaultRequestHeaders.Add("Sec-Fetch-Dest", "empty");
    client.DefaultRequestHeaders.Add("Sec-Fetch-Mode", "cors");
    client.DefaultRequestHeaders.Add("Sec-Fetch-Site", "same-site");

    client.DefaultRequestVersion = System.Net.HttpVersion.Version20;
})
.ConfigurePrimaryHttpMessageHandler(() => 
{
    var handler = new HttpClientHandler
    {
        AutomaticDecompression = System.Net.DecompressionMethods.GZip | System.Net.DecompressionMethods.Deflate
    };

   
    // SECURITY FIX: Solo in sviluppo permettiamo certificati non validi (es. self-signed limitati)
    if (builder.Environment.IsDevelopment())
    {
         handler.ServerCertificateCustomValidationCallback = (sender, cert, chain, sslPolicyErrors) => true;
    }
    
    return handler;
})
.AddPolicyHandler(retryPolicy)
.AddPolicyHandler(circuitBreakerPolicy);

builder.Services.AddHttpClient("NbaCdn", client =>
{
    client.Timeout = TimeSpan.FromMinutes(5);
    client.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36");
    client.DefaultRequestHeaders.Add("Referer", "https://www.nba.com/");
})
.AddPolicyHandler(retryPolicy);

builder.Services.AddHttpClient("CbsSports", client =>
{
    client.Timeout = TimeSpan.FromSeconds(60);
    client.BaseAddress = new Uri("https://www.cbssports.com/");
    client.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
    client.DefaultRequestHeaders.Add("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7");
    client.DefaultRequestHeaders.Add("Accept-Language", "en-US,en;q=0.9");
    client.DefaultRequestHeaders.Add("Referer", "https://www.google.com/");
    client.DefaultRequestHeaders.Add("Upgrade-Insecure-Requests", "1");
    // Client Hints to look more authentic
    client.DefaultRequestHeaders.Add("Sec-Ch-Ua", "\"Not_A Brand\";v=\"8\", \"Chromium\";v=\"120\", \"Google Chrome\";v=\"120\"");
    client.DefaultRequestHeaders.Add("Sec-Ch-Ua-Mobile", "?0");
    client.DefaultRequestHeaders.Add("Sec-Ch-Ua-Platform", "\"Windows\"");
    client.DefaultRequestHeaders.Add("Sec-Fetch-Dest", "document");
    client.DefaultRequestHeaders.Add("Sec-Fetch-Mode", "navigate");
    client.DefaultRequestHeaders.Add("Sec-Fetch-Site", "cross-site");
    client.DefaultRequestHeaders.Add("Sec-Fetch-User", "?1");
    client.DefaultRequestHeaders.Add("Cache-Control", "max-age=0");
})
.ConfigurePrimaryHttpMessageHandler(() => 
{
    var handler = new HttpClientHandler
    {
        AutomaticDecompression = System.Net.DecompressionMethods.GZip | System.Net.DecompressionMethods.Deflate | System.Net.DecompressionMethods.Brotli
    };

    if (builder.Environment.IsDevelopment())
    {
        handler.ServerCertificateCustomValidationCallback = (sender, cert, chain, sslPolicyErrors) => true;
    }

    return handler;
})
.AddPolicyHandler(retryPolicy);

// Registra il servizio (userà IHttpClientFactory internamente)
builder.Services.AddScoped<INbaDataService, NbaDataService>();

// --- FIREBASE ADMIN SDK ---
try
{
    var firebaseCredentialPath = builder.Configuration["Firebase:CredentialPath"];

    if (!string.IsNullOrEmpty(firebaseCredentialPath) && File.Exists(firebaseCredentialPath))
    {
        FirebaseAdmin.FirebaseApp.Create(new FirebaseAdmin.AppOptions
        {
            Credential = Google.Apis.Auth.OAuth2.GoogleCredential.FromFile(firebaseCredentialPath)
        });
    }
    else
    {
        // Try fallback to default credentials (environment variable)
        FirebaseAdmin.FirebaseApp.Create();
    }
}
catch (Exception ex)
{
    Console.WriteLine($"Warning: Firebase App init failed: {ex.Message}");
    // We intentionally do NOT rethrow here to prevent startup crash.
    // AuthController will handle the missing instance gracefully.
}

// ==========================================
// V2 ARCHITECTURE SERVICES
// ==========================================
builder.Services.AddValidatorsFromAssembly(typeof(Program).Assembly);
builder.Services.AddMediatR(cfg => {
    cfg.RegisterServicesFromAssembly(typeof(Program).Assembly);
    cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));
});

// Controllers e JSON Options
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
    });

// Localization
builder.Services.AddLocalization(options => options.ResourcesPath = "Resources");

// Swagger e SignalR
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddSignalR();

builder.Services.AddHostedService<ScoreUpdateService>();
builder.Services.AddHealthChecks();

// ==========================================
// 2. BUILD DELL'APP
// ==========================================
var app = builder.Build();

// ==========================================
// 3. PIPELINE HTTP
// ==========================================

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Localization Middleware
var supportedCultures = new[] { "it-IT", "en-US", "it", "en" };
var localizationOptions = new RequestLocalizationOptions()
    .SetDefaultCulture("it-IT")
    .AddSupportedCultures(supportedCultures)
    .AddSupportedUICultures(supportedCultures);

app.UseRequestLocalization(localizationOptions);

app.UseMiddleware<FantasyBasket.API.Middleware.ExceptionMiddleware>();

app.UseCors("AllowReactApp");

app.UseAuthentication();
app.UseAuthorization(); // Questo attiva i controlli [Authorize]

app.MapHub<DraftHub>("/drafthub");
app.MapHub<MatchupHub>("/matchuphub");
app.MapHealthChecks("/health");
app.MapControllers();

app.Run();