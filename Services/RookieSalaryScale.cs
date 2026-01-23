namespace FantasyBasket.API.Services;

public interface IRookieSalaryScale
{
    double GetSalaryForSlot(int slotNumber, int maxSlots);
}

public class RookieSalaryScale : IRookieSalaryScale
{
    public double GetSalaryForSlot(int slotNumber, int maxSlots)
    {
        if (slotNumber <= 0 || slotNumber > maxSlots)
            throw new ArgumentException($"Slot number must be between 1 and {maxSlots}", nameof(slotNumber));

        // NBA Rookie Scale - Linear decrease from first pick to last
        // Slot #1 = $10M, decreasing linearly to slot #maxSlots = $1M
        const double maxSalary = 12.0;
        const double minSalary = 1.0;

        // Calculate linear progression
        double salaryRange = maxSalary - minSalary;
        double decrement = salaryRange / (maxSlots - 1);
        double salary = maxSalary - (decrement * (slotNumber - 1));

        // Round to 2 decimal places
        return Math.Round(salary, 2);
    }
}
