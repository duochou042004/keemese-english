using System.Security.Cryptography;

namespace Keemese.Api.Modules.Identity.Domain;

public static class TemporaryPassword
{
    // No 0/O/o, 1/l/I/i: the password is read off a terminal and typed by hand.
    public const string Alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    public const int Length = 12;

    public static string New() => new(RandomNumberGenerator.GetItems<char>(Alphabet, Length));
}
