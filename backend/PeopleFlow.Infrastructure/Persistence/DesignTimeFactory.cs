using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace PeopleFlow.Infrastructure.Persistence;

public sealed class PeopleFlowDesignTimeFactory : IDesignTimeDbContextFactory<PeopleFlowDbContext>
{
    public PeopleFlowDbContext CreateDbContext(string[] args)
    {
        var options = new DbContextOptionsBuilder<PeopleFlowDbContext>()
            .UseSqlite("Data Source=design-time.db")
            .Options;
        return new PeopleFlowDbContext(options);
    }
}
