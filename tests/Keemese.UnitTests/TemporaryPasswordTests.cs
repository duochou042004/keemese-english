using Keemese.Api.Modules.Identity.Domain;

namespace Keemese.UnitTests;

public sealed class TemporaryPasswordTests
{
    [Fact]
    public void Is_12_characters_from_the_unambiguous_alphabet()
    {
        Assert.DoesNotContain(TemporaryPassword.Alphabet, c => "0Oo1lIi".Contains(c));
        for (var i = 0; i < 200; i++)
        {
            var password = TemporaryPassword.New();
            Assert.Equal(12, password.Length);
            Assert.All(password, c => Assert.Contains(c, TemporaryPassword.Alphabet));
        }
        Assert.NotEqual(TemporaryPassword.New(), TemporaryPassword.New());
    }
}
