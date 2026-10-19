using Keemese.Api.Infrastructure.Data;

namespace Keemese.UnitTests;

public class SnakeCaseTests
{
    [Theory]
    [InlineData("Users", "users")]
    [InlineData("NormalizedUserName", "normalized_user_name")]
    [InlineData("StudentId", "student_id")]
    [InlineData("PK_Users", "pk_users")]
    [InlineData("IX_StudentActivities_StudentId_Status", "ix_student_activities_student_id_status")]
    [InlineData("HTTPServer", "http_server")]
    [InlineData("Sha256", "sha256")]
    [InlineData("already_snake", "already_snake")]
    public void Converts_ef_names_to_snake_case(string input, string expected) =>
        Assert.Equal(expected, SnakeCase.From(input));
}
