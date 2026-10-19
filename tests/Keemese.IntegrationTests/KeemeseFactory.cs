using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Keemese.IntegrationTests;

public sealed class KeemeseFactory(string connectionString, string dataDir) : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.UseSetting("ConnectionStrings:Db", connectionString);
        builder.UseSetting("DATA_DIR", dataDir);
    }
}
