using FantasyBasket.API.Models;

namespace FantasyBasket.API.Services;

public static class FantasyPointCalculator
{
    public static double Calculate(
        double points, 
        double rebounds, 
        double assists, 
        double steals, 
        double blocks, 
        double turnovers,
        double fgm, double fga,
        double ftm, double fta,
        double threePm, double threePa,
        double offRebounds, double defRebounds,
        bool won,
        LeagueSettings settings)
    {
        // 1. Basic Stats
        double fp = (points * settings.PointWeight) +
                    (assists * settings.AssistWeight) +
                    (steals * settings.StealWeight) +
                    (blocks * settings.BlockWeight) +
                    (turnovers * settings.TurnoverWeight);

        // 2. Rebounds Logic
        // If Off/Def weights are set, use them. 
        // If distinct Off/Def are 0.5/0.5 and Total is 1.2, usually we sum ALL. 
        // Based on user request "Split Rebounds" and typically how we implemented in Handler:
        // width OR * wOr + width DR * wDr + width Total * wR.
        // Usually, if TotalWeight is used, Off/Def might be 0. Or bonus.
        // We will SUM ALL COMPONENTS just like the Handler.
        
        fp += (rebounds * settings.ReboundWeight);
        fp += (offRebounds * settings.OrebWeight);
        fp += (defRebounds * settings.DrebWeight);

        // 3. Shooting Efficiency
        fp += (fgm * settings.FgmWeight);
        fp += (fga * settings.FgaWeight);
        
        fp += (ftm * settings.FtmWeight);
        fp += (fta * settings.FtaWeight);
        
        fp += (threePm * settings.ThreePmWeight);
        fp += (threePa * settings.ThreePaWeight);

        // 4. Win/Loss Bonus
        if (won)
        {
            fp += settings.WinWeight;
        }
        else
        {
            // Usually Loss is 0 or negative
            fp += settings.LossWeight;
        }

        return Math.Round(fp, 1);
    }
    
    // Overload for PlayerGameLog
    public static double Calculate(PlayerGameLog log, LeagueSettings settings)
    {
        return Calculate(
            log.Points,
            log.Rebounds,
            log.Assists,
            log.Steals,
            log.Blocks,
            log.Turnovers,
            log.Fgm, log.Fga,
            log.Ftm, log.Fta,
            log.ThreePm, log.ThreePa,
            log.OffRebounds, log.DefRebounds,
            log.Won, 
            settings
        );
    }

    // Overload for Player (Season Avgs)
    public static double Calculate(Player player, LeagueSettings settings)
    {
        // Player stats are AVERAGES. We must calculate weighted score.
        // We cannot use the base Calculate(..., won:false) because that adds a full LossWeight penalty.
        
        double fp = (player.AvgPoints * settings.PointWeight) +
                    (player.AvgAssists * settings.AssistWeight) +
                    (player.AvgSteals * settings.StealWeight) +
                    (player.AvgBlocks * settings.BlockWeight) +
                    (player.AvgTurnovers * settings.TurnoverWeight);

        // Rebound Logic
        fp += (player.AvgRebounds * settings.ReboundWeight);
        fp += (player.OffRebounds * settings.OrebWeight);
        fp += (player.DefRebounds * settings.DrebWeight);

        // Shooting Efficiency
        fp += (player.Fgm * settings.FgmWeight);
        fp += (player.Fga * settings.FgaWeight);
        
        fp += (player.Ftm * settings.FtmWeight);
        fp += (player.Fta * settings.FtaWeight);
        
        fp += (player.ThreePm * settings.ThreePmWeight);
        fp += (player.ThreePa * settings.ThreePaWeight);

        // Win/Loss (Weighted)
        double winBonus = player.WinPct * settings.WinWeight; 
        double lossMalus = (1.0 - player.WinPct) * settings.LossWeight;

        return Math.Round(fp + winBonus + lossMalus, 1);
    }
    
    // Overload for PlayerSeasonStat (History)
    public static double Calculate(PlayerSeasonStat stat, LeagueSettings settings)
    {
        // PlayerSeasonStat has full details based on model definition
        double fp = (stat.AvgPoints * settings.PointWeight) +
                    (stat.AvgAssists * settings.AssistWeight) +
                    (stat.AvgSteals * settings.StealWeight) +
                    (stat.AvgBlocks * settings.BlockWeight) +
                    (stat.AvgTurnovers * settings.TurnoverWeight);
        
        // Rebound Logic
        fp += (stat.AvgRebounds * settings.ReboundWeight);
        fp += (stat.OffRebounds * settings.OrebWeight);
        fp += (stat.DefRebounds * settings.DrebWeight);

        // Shooting Efficiency
        fp += (stat.Fgm * settings.FgmWeight);
        fp += (stat.Fga * settings.FgaWeight);
        
        fp += (stat.Ftm * settings.FtmWeight);
        fp += (stat.Fta * settings.FtaWeight);
        
        fp += (stat.ThreePm * settings.ThreePmWeight);
        fp += (stat.ThreePa * settings.ThreePaWeight);

        // Win/Loss (Weighted for Season Stats)
        double winBonus = stat.WinPct * settings.WinWeight; 
        double lossMalus = (1.0 - stat.WinPct) * settings.LossWeight;
        
        return Math.Round(fp + winBonus + lossMalus, 1);
    }
}
