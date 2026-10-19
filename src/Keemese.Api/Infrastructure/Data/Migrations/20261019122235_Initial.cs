using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Keemese.Api.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class Initial : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:PostgresExtension:unaccent", ",,");

            // unaccent() is only STABLE; an IMMUTABLE wrapper with a fixed dictionary can back indexes (database.md#conventions).
            migrationBuilder.Sql("""
                CREATE FUNCTION public.f_unaccent(text) RETURNS text
                LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
                RETURN public.unaccent('public.unaccent'::regdictionary, $1);
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP FUNCTION public.f_unaccent(text);");
            migrationBuilder.Sql("DROP EXTENSION IF EXISTS unaccent;");
        }
    }
}
