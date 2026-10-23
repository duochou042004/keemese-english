using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Keemese.IntegrationTests;

public sealed class KeemeseFactory(string connectionString, string dataDir, string environment = "Testing") : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment(environment);
        builder.UseSetting("ConnectionStrings:Db", connectionString);
        builder.UseSetting("DATA_DIR", dataDir);
    }
}
