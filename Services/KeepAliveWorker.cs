using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;

namespace FantasyBasket.API.Services
{
    public class KeepAliveWorker : BackgroundService
    {
        private readonly ILogger<KeepAliveWorker> _logger;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly string? _publicUrl;

        public KeepAliveWorker(ILogger<KeepAliveWorker> logger, IHttpClientFactory httpClientFactory)
        {
            _logger = logger;
            _httpClientFactory = httpClientFactory;
            _publicUrl = Environment.GetEnvironmentVariable("APP_PUBLIC_URL");
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            if (string.IsNullOrEmpty(_publicUrl))
            {
                _logger.LogWarning("KeepAliveWorker: APP_PUBLIC_URL is missing. Skipping pings.");
                return;
            }

            _logger.LogInformation("KeepAliveWorker: Starting pings to {Url}/health every 14 minutes.", _publicUrl);

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    var client = _httpClientFactory.CreateClient();
                    var healthUrl = $"{_publicUrl.TrimEnd('/')}/health";

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
