// Fixture types for ModuleBoundaryTests: one allowed and one forbidden cross-module reference.
namespace Keemese.UnitTests.BoundaryFixture.Modules.Students
{
    internal sealed class StudentService;
}

namespace Keemese.UnitTests.BoundaryFixture.Modules.Students.Contracts
{
    internal interface IStudentDirectory;
}

namespace Keemese.UnitTests.BoundaryFixture.Modules.Billing
{
    using Keemese.UnitTests.BoundaryFixture.Modules.Students;
    using Keemese.UnitTests.BoundaryFixture.Modules.Students.Contracts;

    internal sealed class InvoiceService(IStudentDirectory directory, StudentService forbidden)
    {
        public IStudentDirectory Directory { get; } = directory;
        public StudentService Forbidden { get; } = forbidden;
    }
}
