namespace Keemese.UnitTests;

// Temporary (T-003 verification): proves CI uploads TRX on failure. Reverted in the next commit.
public class DeliberateFailureTests
{
    [Fact]
    public void Fails() => Assert.Fail("deliberate failure for the CI artifact check");
}
