using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using Microsoft.Extensions.Logging.Abstractions;
using MovexPortal.Services;
using Xunit;

namespace MovexPortal.Tests;

/// <summary>
/// ReportAccess decides which catalog roles a Windows user holds. Windows authentication
/// carries AD groups as SIDs (groupsid claims), never names, so configured group names are
/// resolved to SIDs once and matched against the token.
/// </summary>
public class ReportAccessTests
{
    private const string FinanceSid = "S-1-5-21-100-200-300-1111";
    private const string ItSid = "S-1-5-21-100-200-300-2222";

    internal static ClaimsPrincipal User(params (string Type, string Value)[] claims)
    {
        var all = new List<Claim> { new(ClaimTypes.Name, "SRXGLOBAL\\someone") };
        foreach (var (type, value) in claims) all.Add(new Claim(type, value));
        return new ClaimsPrincipal(new ClaimsIdentity(all, "NTLM"));
    }

    private static ReportAccess Access(Dictionary<string, string[]> roleSids) =>
        new(roleSids.ToDictionary(kv => kv.Key, kv => (IReadOnlyCollection<string>)kv.Value));

    [Fact]
    public void UserInMappedGroup_CanRunReportsForThatRole()
    {
        var access = Access(new() { ["Reporting_Read"] = [FinanceSid] });

        var user = User((ClaimTypes.GroupSid, ItSid), (ClaimTypes.GroupSid, FinanceSid));

        Assert.True(access.CanRun(user, "Reporting_Read"));
    }

    [Fact]
    public void UserNotInMappedGroup_IsDenied()
    {
        var access = Access(new() { ["Reporting_Read"] = [FinanceSid] });

        var user = User((ClaimTypes.GroupSid, ItSid));

        Assert.False(access.CanRun(user, "Reporting_Read"));
    }

    [Fact]
    public void ReportRoleNotConfigured_IsDenied()
    {
        var access = Access(new() { ["Reporting_Read"] = [FinanceSid] });

        Assert.False(access.CanRun(User((ClaimTypes.GroupSid, FinanceSid)), "Production_Read"));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("  ")]
    public void ReportWithNoRequiredRole_IsDenied(string? role)
    {
        var access = Access(new() { ["Reporting_Read"] = [FinanceSid] });

        Assert.False(access.CanRun(User((ClaimTypes.GroupSid, FinanceSid)), role));
    }

    [Fact]
    public void RoleNamesAreCaseInsensitive()
    {
        var access = Access(new() { ["Reporting_Read"] = [FinanceSid] });

        Assert.True(access.CanRun(User((ClaimTypes.GroupSid, FinanceSid)), "REPORTING_READ"));
    }

    [Fact]
    public void IndividualUserMapping_MatchesPrimarySid()
    {
        const string userSid = "S-1-5-21-100-200-300-9999";
        var access = Access(new() { ["Reporting_Read"] = [userSid] });

        Assert.True(access.CanRun(User((ClaimTypes.PrimarySid, userSid)), "Reporting_Read"));
    }

    [Fact]
    public void DenyOnlyGroups_DoNotGrantAccess()
    {
        // Deny-only SIDs (e.g. Administrators under UAC filtering) are in the token but must not count.
        var access = Access(new() { ["Reporting_Read"] = [FinanceSid] });

        Assert.False(access.CanRun(User((ClaimTypes.DenyOnlySid, FinanceSid)), "Reporting_Read"));
    }

    [Fact]
    public void NothingConfigured_DeniesEveryone()
    {
        var access = Access(new());

        Assert.False(access.CanRun(User((ClaimTypes.GroupSid, FinanceSid)), "Reporting_Read"));
    }

    // ── Building from configuration ───────────────────────────────────────────────

    [Fact]
    public void FromConfiguration_ResolvesGroupNamesToSids()
    {
        var resolver = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase)
        {
            ["SRXGLOBAL\\PORTAL-REPORTS-FIN"] = FinanceSid
        };

        var access = ReportAccess.FromConfiguration(
            new() { ["Reporting_Read"] = ["SRXGLOBAL\\PORTAL-REPORTS-FIN"] },
            name => resolver.GetValueOrDefault(name),
            NullLogger.Instance);

        Assert.True(access.CanRun(User((ClaimTypes.GroupSid, FinanceSid)), "Reporting_Read"));
    }

    [Fact]
    public void FromConfiguration_UnresolvableGroup_IsSkipped_AndTheRestStillWork()
    {
        // A typo in one group must not take down the portal or the other groups — it just grants nothing.
        var access = ReportAccess.FromConfiguration(
            new() { ["Reporting_Read"] = ["SRXGLOBAL\\TYPO-GROUP", "SRXGLOBAL\\IT"] },
            name => name == "SRXGLOBAL\\IT" ? ItSid : null,
            NullLogger.Instance);

        Assert.True(access.CanRun(User((ClaimTypes.GroupSid, ItSid)), "Reporting_Read"));
        Assert.False(access.CanRun(User((ClaimTypes.GroupSid, FinanceSid)), "Reporting_Read"));
    }

    [Fact]
    public void FromConfiguration_SidEntry_IsUsedAsIsWithoutLookup()
    {
        // Fallback when name lookup is unavailable (e.g. broken domain trust): paste the group's SID.
        var access = ReportAccess.FromConfiguration(
            new() { ["Reporting_Read"] = [FinanceSid] },
            _ => throw new InvalidOperationException("lookup must not be called for a SID"),
            NullLogger.Instance);

        Assert.True(access.CanRun(User((ClaimTypes.GroupSid, FinanceSid)), "Reporting_Read"));
    }

    [Fact]
    public void FromConfiguration_ResolverThrows_IsTreatedAsUnresolvable()
    {
        var access = ReportAccess.FromConfiguration(
            new() { ["Reporting_Read"] = ["SRXGLOBAL\\PORTAL-REPORTS-FIN"] },
            _ => throw new InvalidOperationException("domain controller unreachable"),
            NullLogger.Instance);

        Assert.False(access.CanRun(User((ClaimTypes.GroupSid, FinanceSid)), "Reporting_Read"));
    }
}
