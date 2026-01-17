using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System;
using System.Linq;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;

namespace FantasyBasket.API.Services
{
    public class KeepAliveWorker : BackgroundService
    {
        private readonly ILogger<KeepAliveWorker> _logger;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IServer _server;
        private readonly IHostApplicationLifetime _lifetime;

        public KeepAliveWorker(
            ILogger<KeepAliveWorker> logger, 
            IHttpClientFactory httpClientFactory,
            IServer server,
            IHostApplicationLifetime lifetime)
        {
            _logger = logger;
            _httpClientFactory = httpClientFactory;
            _server = server;
            _lifetime = lifetime;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            // Otteniamo il Task che segnala quando l'applicazione è avviata
            var startupTask = new TaskCompletionSource();
            using var registration = _lifetime.ApplicationStarted.Register(() => startupTask.SetResult());

            // Aspettiamo che l'app sia avviata per poter leggere gli indirizzi del server
            await startupTask.Task;

            var addresses = _server.Features.Get<IServerAddressesFeature>()?.Addresses;
            var pingUrl = addresses?.FirstOrDefault();

            if (string.IsNullOrEmpty(pingUrl))
            {
                _logger.LogWarning("KeepAliveWorker: Could not detect server address. Skipping keep-alive pings.");
                return;
            }

            // Normalizza l'indirizzo se è un binding generico (0.0.0.0 o [::])
            if (pingUrl.Contains("0.0.0.0")) pingUrl = pingUrl.Replace("0.0.0.0", "localhost");
            if (pingUrl.Contains("[::]")) pingUrl = pingUrl.Replace("[::]", "localhost");

            _logger.LogInformation("KeepAliveWorker: Detected self-ping address: {Url}. Starting pings to {Url}/health every 14 minutes.", pingUrl, pingUrl);

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    var client = _httpClientFactory.CreateClient();
                    var healthUrl = $"{pingUrl.TrimEnd('/')}/health";

                    _logger.LogInformation("KeepAliveWorker: Pinging {Url}...", healthUrl);
                    
                    var response = await client.GetAsync(healthUrl, stoppingToken);

                    if (response.IsSuccessStatusCode)
                    {
                        _logger.LogInformation("KeepAliveWorker: Successfully pinged {Url}. Status: {Status}", healthUrl, response.StatusCode);
                    }
                    else
                    {
                        _logger.LogWarning("KeepAliveWorker: Failed to ping {Url}. Status: {Status}", healthUrl, response.StatusCode);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "KeepAliveWorker: Exception occurred while pinging.");
                }

                // Wait for 14 minutes
                await Task.Delay(TimeSpan.FromMinutes(14), stoppingToken);
            }
        }
    }
}
