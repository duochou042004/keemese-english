using System.Text;

namespace Keemese.Api.Infrastructure.Data;

public static class SnakeCase
{
    /// <summary>"NormalizedUserName" → "normalized_user_name", "IX_Users_Id" → "ix_users_id", "HTTPServer" → "http_server".</summary>
    public static string From(string name)
    {
        var sb = new StringBuilder(name.Length + 8);
        for (var i = 0; i < name.Length; i++)
        {
            var c = name[i];
            if (char.IsUpper(c) && i > 0 && sb[^1] != '_'
                && (char.IsLower(name[i - 1]) || char.IsDigit(name[i - 1])
                    || (i + 1 < name.Length && char.IsLower(name[i + 1]))))
            {
                sb.Append('_');
            }
            sb.Append(char.ToLowerInvariant(c));
        }
        return sb.ToString();
    }
}
