using Keemese.Api.Modules.Identity.Domain;

namespace Keemese.UnitTests;

public sealed class PasswordPolicyTests
{
    [Theory]
    [InlineData(null, PasswordPolicy.TooShort)]
    [InlineData("", PasswordPolicy.TooShort)]
    [InlineData("nine-char", PasswordPolicy.TooShort)]
    [InlineData("qwertyuiop", PasswordPolicy.TooCommon)]
    [InlineData("QwertyUIOP", PasswordPolicy.TooCommon)] // case-insensitive
    [InlineData("1234567890", PasswordPolicy.TooCommon)]
    [InlineData("password123", PasswordPolicy.TooCommon)]
    [InlineData("ten chars!", null)] // no composition rules; spaces allowed
    [InlineData("invented-tutor-pass", null)]
    [InlineData("học tiếng anh mỗi ngày", null)]
    public void Checks_length_then_the_common_list(string? password, string? expected) =>
        Assert.Equal(expected, PasswordPolicy.Check(password));

    [Fact]
    public void Rejects_more_than_256_characters() =>
        Assert.Equal(PasswordPolicy.TooLong, PasswordPolicy.Check(new string('x', 257)));
}
