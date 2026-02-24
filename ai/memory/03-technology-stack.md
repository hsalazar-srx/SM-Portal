# MOVEX-Portal - Technology Stack

**Last Updated**: 2026-02-05  
**Status**: Phase 1 - Foundation  
**Version**: 0.1.0 (Pre-Alpha)  
**UI Architecture**: React 18 + shadcn/ui + Tailwind CSS

## 📚 Technology Overview

The MOVEX-Portal technology stack is carefully selected to support security, maintainability, performance, and ISO 27001 compliance within SRX Global's Windows-based infrastructure.

---

## 🎯 Technology Selection Criteria

| Criterion | Weight | Priority |
|-----------|--------|----------|
| **Security** | 30% | ★★★★★ |
| **Integration** | 25% | ★★★★★ (AD, M3, existing infra) |
| **Maintainability** | 20% | ★★★★☆ |
| **Performance** | 15% | ★★★☆☆ |
| **Developer Familiarity** | 10% | ★★★★☆ |

---

## 🏗️ Core Framework

### ASP.NET Core 8.0
**Version**: 8.0.x (LTS)  
**License**: MIT  
**Official Docs**: https://docs.microsoft.com/en-us/aspnet/core

**Why Chosen:**
- ✅ **Native Windows Integration** - First-class support for Windows Authentication, IIS, Active Directory
- ✅ **Security** - Built-in CSRF protection, HSTS, security headers, secure-by-default
- ✅ **Performance** - High throughput, async/await, HTTP/2 support
- ✅ **LTS Support** - 3 years of support (until Nov 2026)
- ✅ **Razor Pages** - Server-side rendering, excellent for form-heavy apps
- ✅ **Middleware Pipeline** - Perfect for RBAC/audit cross-cutting concerns

**Alternatives Considered:**
- ❌ ASP.NET Framework 4.8 - Legacy, no cross-platform, slower evolution
- ❌ Node.js/Express - Poor Windows Auth integration, unfamiliar to team
- ❌ PHP/Laravel - Not aligned with Microsoft ecosystem

**Key Features Used:**
```
- Razor Pages (UI)
- Middleware (RBAC, Audit, Exception Handling)
- Dependency Injection
- Configuration System (hot-reload)
- Health Checks
- Logging Abstractions
```

---

### C# 12
**Version**: 12.0  
**License**: MIT  

**Why Chosen:**
- ✅ **Type Safety** - Strong typing reduces runtime errors
- ✅ **Async/Await** - Native async programming for I/O operations
- ✅ **LINQ** - Expressive data manipulation
- ✅ **Modern Features** - Primary constructors, collection expressions, pattern matching

**Key Features Used:**
```csharp
// Primary constructors (C# 12)
public class EndpointExecutor(
    IMovexApiClient apiClient,
    IConfigService configService,
    IAuditService auditService)
{
    // Fields auto-generated
}

// Pattern matching
var result = response switch
{
    { Success: true, Data: not null } => ProcessData(response.Data),
    { Success: false, Error: var err } => HandleError(err),
    _ => throw new InvalidOperationException()
};

// Collection expressions (C# 12)
string[] roles = [user.Role1, user.Role2, user.Role3];
```

---

## 🎨 Frontend Layer

### React 18
**Version**: 18.2+  
**License**: MIT  
**Official Docs**: https://react.dev

**Why Chosen:**
- ✅ **Modern UX** - Component-based SPA for instant, fluid interactions
- ✅ **"Flashy" Requirement** - Enables rich animations and smooth transitions
- ✅ **Large Ecosystem** - 90k+ npm packages, massive community
- ✅ **TypeScript Support** - First-class TypeScript integration
- ✅ **Developer Experience** - Hot Module Replacement, React DevTools
- ✅ **Future-Proof** - Can add mobile apps (React Native) on same API

**Alternatives Considered:**
- ❌ Razor Pages - Server-side rendering, page reloads, limited interactivity
- ❌ Blazor - Smaller ecosystem, larger bundle size (WebAssembly overhead)
- ❌ Vue.js - Good but smaller ecosystem than React

**Key Features Used:**
```typescript
// Component-based architecture
// Hooks (useState, useEffect, custom hooks)
// React Router for client-side navigation
// TanStack Query for server state
// Zustand for global state
```

---

### shadcn/ui
**Version**: Latest  
**License**: MIT  
**Official Docs**: https://ui.shadcn.com

**Why Chosen:**
- ✅ **Modern Aesthetics** - Contemporary design (not generic Material Design)
- ✅ **Lightweight** - ~95KB bundle vs Material-UI's ~280KB
- ✅ **Copy-Paste Approach** - You own the component code (no npm dependency)
- ✅ **Radix UI Primitives** - Accessible, unstyled foundation (WCAG AAA)
- ✅ **Full Customization** - Modify components directly in codebase
- ✅ **Trending** - Rapidly growing adoption in 2026

**Alternatives Considered:**
- ❌ Material-UI - Heavier (~280KB), opinionated Material Design, everyone recognizes it
- ❌ Ant Design - Chinese aesthetic, heavy bundle
- ❌ Chakra UI - Good but less trendy in 2026

**Components Used:**
```bash
# Installation (copies to src/components/ui/)
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add form
npx shadcn-ui@latest add input
npx shadcn-ui@latest add select
npx shadcn-ui@latest add table
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add alert
npx shadcn-ui@latest add toast
```

---

### Tailwind CSS 3.4+
**Version**: 3.4+  
**License**: MIT  
**Official Docs**: https://tailwindcss.com

**Why Chosen:**
- ✅ **Utility-First** - Rapid UI development with utility classes
- ✅ **Build-Time CSS** - No runtime overhead (vs CSS-in-JS)
- ✅ **Purging** - Removes unused CSS, tiny production bundle
- ✅ **Customizable** - Easy to apply SRX brand colors
- ✅ **Responsive** - Mobile-first responsive design built-in
- ✅ **Dark Mode** - Easy dark mode support

**SRX Theme Configuration:**
```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        primary: {
          500: '#1976d2',  // SRX Blue
        },
        secondary: {
          500: '#dc004e',  // SRX Red
        },
        success: { 500: '#4caf50' },
        error: { 500: '#f44336' },
      },
    },
  },
}
```

**Example Usage:**
```tsx
<div className="flex items-center justify-between p-4 bg-primary-500 text-white">
  <h1 className="text-2xl font-bold">MOVEX Portal</h1>
</div>
```

---

### TypeScript 5
**Version**: 5.3+  
**License**: Apache 2.0  
**Official Docs**: https://www.typescriptlang.org

**Why Chosen:**
- ✅ **Type Safety** - Catch errors at compile time
- ✅ **IntelliSense** - Excellent IDE support (autocomplete, refactoring)
- ✅ **Self-Documenting** - Types serve as inline documentation
- ✅ **Refactoring** - Safe large-scale code changes

**Frontend Type Examples:**
```typescript
// Endpoint definition
interface Endpoint {
  id: string;
  program: string;
  method: string;
  displayName: string;
  requiredRole: string;
  fields: Field[];
}

// Form input type
interface EndpointInput {
  [key: string]: string | number | boolean;
}

// API response
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

---

## 🔧 Frontend State Management

### Zustand (Global State)
**Version**: 4.5+  
**License**: MIT  
**Why**: Lighter than Redux, simpler API

```typescript
// stores/authStore.ts
import { create } from 'zustand'

interface AuthState {
  user: User | null;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  login: (user, token) => set({ user, token }),
  logout: () => set({ user: null, token: null }),
}));
```

### TanStack Query (Server State)
**Version**: 5.x  
**License**: MIT  
**Why**: Best-in-class server state management & caching

```typescript
// hooks/useEndpoints.ts
import { useQuery } from '@tanstack/react-query'

export function useEndpoints() {
  return useQuery({
    queryKey: ['endpoints'],
    queryFn: () => api.getEndpoints(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
```

---

## 💻 Backend Layer (Unchanged)

### ASP.NET Core 8.0 API
**Version**: 8.0.x (LTS)  
**License**: MIT  
**Official Docs**: https://docs.microsoft.com/en-us/aspnet/core

**Why Chosen:**
- ✅ **Native Windows Integration** - First-class support for Windows Authentication, IIS, Active Directory
- ✅ **Security** - Built-in CSRF protection, HSTS, security headers, secure-by-default
- ✅ **Performance** - High throughput, async/await, HTTP/2 support
- ✅ **LTS Support** - 3 years of support (until Nov 2026)
- ✅ **RESTful API** - JSON endpoints for React frontend
- ✅ **Middleware Pipeline** - Perfect for RBAC/audit cross-cutting concerns

**Alternatives Considered:**
- ❌ ASP.NET Framework 4.8 - Legacy, no cross-platform, slower evolution
- ❌ Node.js/Express - Poor Windows Auth integration, unfamiliar to team
- ❌ PHP/Laravel - Not aligned with Microsoft ecosystem

**Key Features Used:**
```
- API Controllers (JSON endpoints)
- Middleware (RBAC, Audit, Exception Handling)
- Dependency Injection
- Configuration System (hot-reload)
- Health Checks
- Logging Abstractions
```
- ✅ **Model Binding** - Automatic form data binding & validation
- ✅ **Simpler than MVC** - Less ceremony for straightforward CRUD

**Alternatives Considered:**
- ❌ Blazor Server - Overkill for simple forms, WebSocket dependency
- ❌ React/Vue - Requires separate build process, API duplication
- ❌ MVC - More boilerplate for page-centric app

**Usage Pattern:**
```
Pages/
├── Execute/
│   ├── Index.cshtml          # List all endpoints
│   ├── Index.cshtml.cs       # PageModel
│   └── {EndpointId}.cshtml   # Dynamic endpoint form
├── Admin/
│   ├── Users.cshtml          # RBAC management
│   └── Audit.cshtml          # Audit log viewer
└── _Layout.cshtml            # Shared layout
```

### Bootstrap 5.3
**Version**: 5.3.x  
**License**: MIT  
**CDN**: `https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/`

**Why Chosen:**
- ✅ **Mature & Stable** - Industry standard
- ✅ **Responsive** - Mobile-friendly out of the box
- ✅ **Component Library** - Forms, tables, modals, alerts
- ✅ **No Build Step** - Can use via CDN
- ✅ **Accessibility** - ARIA support built-in

**Components Used:**
```
- Forms (input groups, validation states)
- Tables (sortable, filterable audit logs)
- Modals (confirmations, warnings)
- Alerts (success/error messages)
- Cards (endpoint grouping)
- Navigation (breadcrumbs, tabs)
```

### jQuery 3.7
**Version**: 3.7.x  
**License**: MIT  
**CDN**: `https://code.jquery.com/jquery-3.7.0.min.js`

**Why Chosen:**
- ✅ **Bootstrap Dependency** - Required for Bootstrap components
- ✅ **Form Enhancement** - Dynamic field validation, AJAX submissions
- ✅ **Minimal** - Only for progressive enhancement

**Usage**:
```javascript
// Dynamic field visibility based on endpoint config
$(document).ready(function() {
    $('#endpointSelect').change(function() {
        loadDynamicForm($(this).val());
    });
});
```

---

## 🔐 Security & Authentication

### Windows Authentication
**Built into IIS + ASP.NET Core**  

**Why Chosen:**
- ✅ **Single Sign-On** - Users auto-authenticated via Kerberos
- ✅ **AD Integration** - Direct access to user groups
- ✅ **Zero Password Management** - No credential storage
- ✅ **ISO 27001 Compliant** - Strong authentication control

**Configuration:**
```csharp
// Program.cs
builder.Services.AddAuthentication(IISDefaults.AuthenticationScheme);
builder.Services.AddAuthorization();
```

```xml
<!-- web.config -->
<system.webServer>
  <security>
    <authentication>
      <windowsAuthentication enabled="true" />
      <anonymousAuthentication enabled="false" />
    </authentication>
  </security>
</system.webServer>
```

**RBAC Testing Endpoint:**
```http
GET /api/auth/test
```
Returns AD user identity and claims for RBAC validation.

### ASP.NET Core Identity (Not Used)
**Decision**: Skipped in favor of Windows Authentication  
**Reason**: Adds unnecessary complexity when AD is authoritative source

---

## 📊 Data Access

### SQL Server 2019
**Version**: 15.0  
**Edition**: Standard  
**License**: Commercial (existing SRX license)

**Why Chosen:**
- ✅ **Existing Infrastructure** - Already deployed (SRXDB01)
- ✅ **Mature** - Proven reliability, extensive tooling
- ✅ **Audit Support** - Append-only tables, temporal tables, encryption
- ✅ **Windows Auth** - Seamless integration
- ✅ **SSIS/SSRS** - Audit report generation capabilities

**Schema Design:**
```sql
-- Audit log table (append-only)
CREATE TABLE AuditLogs (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    Timestamp DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    Username NVARCHAR(256) NOT NULL,
    EndpointId NVARCHAR(100) NOT NULL,
    Action NVARCHAR(50) NOT NULL,
    InputData NVARCHAR(MAX) NULL,
    OutputData NVARCHAR(MAX) NULL,
    Status NVARCHAR(20) NOT NULL,
    DurationMs INT NOT NULL,
    IpAddress NVARCHAR(45) NULL,
    IntegrityHash NVARCHAR(64) NOT NULL,
    CONSTRAINT CK_Status CHECK (Status IN ('SUCCESS', 'ERROR', 'DENIED'))
);

-- Index for query performance
CREATE NONCLUSTERED INDEX IX_AuditLogs_User_Timestamp 
    ON AuditLogs (Username, Timestamp DESC);

CREATE NONCLUSTERED INDEX IX_AuditLogs_Endpoint_Timestamp 
    ON AuditLogs (EndpointId, Timestamp DESC);
```

### Dapper (Micro-ORM)
**Version**: 2.1.x  
**License**: Apache 2.0  
**NuGet**: `Dapper`

**Why Chosen:**
- ✅ **Performance** - 5-10x faster than EF Core for reads
- ✅ **Simplicity** - Direct SQL control, no magic
- ✅ **Audit Use Case** - Mostly inserts & simple queries
- ✅ **Lightweight** - No change tracking overhead

**Alternatives Considered:**
- ❌ Entity Framework Core - Overkill for simple audit schema, slower
- ❌ ADO.NET Raw - Too much boilerplate, error-prone

**Usage Example:**
```csharp
public async Task LogAuditAsync(AuditRecord record)
{
    const string sql = @"
        INSERT INTO AuditLogs 
        (Username, EndpointId, Action, InputData, OutputData, Status, DurationMs, IpAddress, IntegrityHash)
        VALUES 
        (@Username, @EndpointId, @Action, @InputData, @OutputData, @Status, @DurationMs, @IpAddress, @IntegrityHash)";
    
    using var connection = new SqlConnection(_connectionString);
    await connection.ExecuteAsync(sql, record);
}
```

---

## 🔄 HTTP & Integration

### System.Net.Http.HttpClient
**Built into .NET**  

**Why Chosen:**
- ✅ **Modern** - Async/await, connection pooling, HTTP/2
- ✅ **Resilience** - Integrates with Polly for retries
- ✅ **Testable** - IHttpClientFactory for DI & mocking

**Configuration:**
```csharp
builder.Services.AddHttpClient<IMovexApiClient, MovexApiClient>(client =>
{
    client.BaseAddress = new Uri("http://srxwebapp1:5000");
    client.Timeout = TimeSpan.FromSeconds(30);
    client.DefaultRequestHeaders.Add("X-API-Key", apiKey);
})
.AddPolicyHandler(GetRetryPolicy());

static IAsyncPolicy<HttpResponseMessage> GetRetryPolicy()
{
    return HttpPolicyExtensions
        .HandleTransientHttpError()
        .WaitAndRetryAsync(3, retryAttempt => 
            TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)));
}
```

### Polly (Resilience Framework)
**Version**: 8.x  
**License**: BSD 3-Clause  
**NuGet**: `Polly`, `Polly.Extensions.Http`

**Why Chosen:**
- ✅ **Retry Logic** - Automatic retries for transient failures
- ✅ **Circuit Breaker** - Prevent cascading failures
- ✅ **Timeout** - Consistent timeout handling
- ✅ **Integration** - Works seamlessly with HttpClient

**Policies Used:**
```csharp
// Retry policy (exponential backoff)
var retryPolicy = Policy
    .Handle<HttpRequestException>()
    .WaitAndRetryAsync(3, retryAttempt => 
        TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)));

// Circuit breaker (fail fast after 5 consecutive failures)
var circuitBreakerPolicy = Policy
    .Handle<HttpRequestException>()
    .CircuitBreakerAsync(5, TimeSpan.FromMinutes(1));

// Timeout (per-request)
var timeoutPolicy = Policy.TimeoutAsync<HttpResponseMessage>(30);

// Combine policies
var combinedPolicy = Policy.WrapAsync(retryPolicy, circuitBreakerPolicy, timeoutPolicy);
```

---

## 📝 Logging & Monitoring

### Serilog
**Version**: 3.x  
**License**: Apache 2.0  
**NuGet**: `Serilog.AspNetCore`, `Serilog.Sinks.File`

**Why Chosen:**
- ✅ **Structured Logging** - JSON output, queryable logs
- ✅ **Sinks** - File, Seq, Elasticsearch, etc.
- ✅ **Performance** - Async logging, minimal overhead
- ✅ **Enrichment** - Auto-capture request context

**Configuration:**
```csharp
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .MinimumLevel.Override("Microsoft.AspNetCore", LogEventLevel.Warning)
    .Enrich.FromLogContext()
    .Enrich.WithMachineName()
    .Enrich.WithThreadId()
    .WriteTo.File(
        path: @"C:\Logs\MOVEX-Portal\log-.txt",
        rollingInterval: RollingInterval.Day,
        retainedFileCountLimit: 90,
        outputTemplate: "{Timestamp:yyyy-MM-dd HH:mm:ss.fff} [{Level:u3}] {Message:lj}{NewLine}{Exception}")
    .CreateLogger();

builder.Host.UseSerilog();
```

**Log Levels:**
```
- Verbose: Detailed diagnostic (development only)
- Debug: Internal flow, config changes
- Information: Business events (endpoint executions)
- Warning: Unexpected but handled (retry after failure)
- Error: Unhandled exceptions
- Fatal: Critical failures (app crash)
```

### Application Insights (Future)
**Status**: Planned for Phase 2  
**Use Case**: Real-time monitoring, performance metrics, alerting

---

## ✅ Validation & Serialization

### FluentValidation
**Version**: 11.x  
**License**: Apache 2.0  
**NuGet**: `FluentValidation.AspNetCore`

**Why Chosen:**
- ✅ **Expressive** - Readable, chainable rules
- ✅ **Separation** - Validation logic separate from models
- ✅ **Testable** - Easy to unit test validators
- ✅ **Complex Rules** - Cross-field validation, async rules

**Example:**
```csharp
public class EndpointInputValidator : AbstractValidator<EndpointInput>
{
    public EndpointInputValidator(EndpointDefinition endpoint)
    {
        foreach (var field in endpoint.InputFields)
        {
            RuleFor(x => x.Fields[field.Name])
                .NotEmpty().When(_ => field.Required)
                .Matches(field.ValidationRegex).When(_ => !string.IsNullOrEmpty(field.ValidationRegex))
                .MaximumLength(field.MaxLength).When(_ => field.MaxLength > 0);
        }
    }
}
```

### System.Text.Json
**Built into .NET**  

**Why Chosen:**
- ✅ **Performance** - 2-3x faster than Newtonsoft.Json
- ✅ **Native** - No extra dependencies
- ✅ **Security** - DoS protection, configurable depth limits
- ✅ **Modern** - Support for C# 9+ features (records, init-only)

**Alternatives Considered:**
- ❌ Newtonsoft.Json - Legacy, slower, less secure defaults

**Configuration:**
```csharp
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.PropertyNameCaseInsensitive = true;
    options.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    options.SerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
    options.SerializerOptions.MaxDepth = 32; // DoS protection
});
```

---

## 🧪 Testing

### xUnit.net
**Version**: 2.6.x  
**License**: Apache 2.0  
**NuGet**: `xunit`, `xunit.runner.visualstudio`

**Why Chosen:**
- ✅ **Modern** - .NET Core native, async support
- ✅ **Isolated** - Each test gets own class instance
- ✅ **Extensible** - Attributes, test collections, fixtures

**Alternatives Considered:**
- ❌ NUnit - Less idiomatic for .NET Core
- ❌ MSTest - Less flexible

### Moq
**Version**: 4.20.x  
**License**: BSD 3-Clause  
**NuGet**: `Moq`

**Why Chosen:**
- ✅ **Simple** - Easy to mock interfaces
- ✅ **Verification** - Assert method calls
- ✅ **Setup Flexibility** - Return values, throw exceptions, callbacks

**Example:**
```csharp
[Fact]
public async Task ExecuteEndpoint_ValidInput_ReturnsSuccess()
{
    // Arrange
    var mockApiClient = new Mock<IMovexApiClient>();
    mockApiClient
        .Setup(x => x.ExecuteAsync(It.IsAny<string>(), It.IsAny<object>()))
        .ReturnsAsync(new MovexResponse { Success = true });
    
    var executor = new EndpointExecutor(mockApiClient.Object, ...);
    
    // Act
    var result = await executor.ExecuteAsync("get-item-basic", new { ITNO = "ITEM123" });
    
    // Assert
    Assert.True(result.Success);
    mockApiClient.Verify(x => x.ExecuteAsync("MMS200MI.GetItmBasic", It.IsAny<object>()), Times.Once);
}
```

### Playwright (E2E Testing)
**Version**: 1.40.x  
**License**: Apache 2.0  
**NuGet**: `Microsoft.Playwright`

**Why Chosen:**
- ✅ **Cross-Browser** - Chromium, Firefox, WebKit
- ✅ **Modern** - Handles SPAs, async operations
- ✅ **Auto-Wait** - Reduces flaky tests
- ✅ **Screenshots** - Debugging failed tests

**Status**: Planned for Phase 2

---

## 🛠️ Development Tools

### Visual Studio 2022
**Version**: 17.8+  
**Edition**: Professional  
**License**: Commercial (existing SRX license)

**Features Used:**
- C# IntelliSense & refactoring
- Integrated debugger
- NuGet package management
- Git integration
- Razor syntax support

### GitHub Copilot
**Integration**: VS Code + Visual Studio  

**Why Used:**
- ✅ **Code Generation** - Boilerplate, patterns from skills
- ✅ **Documentation** - Inline comments, XML docs
- ✅ **Test Generation** - Unit test scaffolding

### Postman
**Version**: Latest  
**License**: Free (team plan)

**Use Case**:
- Test Movex REST API endpoints
- Share API collections with team
- Environment management (dev, test, prod)

---

## 🚀 Deployment & Operations

### IIS 10
**Built into Windows Server 2019**  

**Why Chosen:**
- ✅ **Windows Native** - Best ASP.NET Core host on Windows
- ✅ **Windows Auth** - Seamless Kerberos integration
- ✅ **Management** - Familiar to IT team
- ✅ **Reverse Proxy** - Built-in load balancing, SSL termination

**Configuration:**
```
- In-Process Hosting (faster than out-of-process)
- Application Pool: No Managed Code (.NET Core runs standalone)
- HTTPS Binding: TLS 1.3, strong ciphers only
- IP Restrictions: Allow 192.168.1.0/24 only
```

### Windows Server 2019
**Version**: 1809  
**License**: Commercial (existing SRX license)

**Features Used:**
- Active Directory integration
- Windows Firewall
- Windows Defender
- Event Viewer (centralized logging)

---

## 📦 NuGet Packages (Summary)

| Package | Version | Purpose |
|---------|---------|---------|
| `Microsoft.AspNetCore.App` | 8.0.x | Core framework |
| `Serilog.AspNetCore` | 3.x | Logging |
| `Dapper` | 2.1.x | Data access |
| `FluentValidation.AspNetCore` | 11.x | Input validation |
| `Polly` | 8.x | Resilience & retries |
| `Polly.Extensions.Http` | 3.x | HttpClient integration |
| `xUnit` | 2.6.x | Unit testing |
| `Moq` | 4.20.x | Mocking |
| `Microsoft.Data.SqlClient` | 5.x | SQL Server driver |
| `System.IdentityModel.Tokens.Jwt` | 7.x | JWT validation (future) |

**Total Packages**: ~15  
**Combined Size**: ~25 MB  
**Update Frequency**: Quarterly (security patches)

---

## 🔄 Versioning Strategy

### Semantic Versioning (SemVer)
```
MAJOR.MINOR.PATCH (e.g., 1.2.3)

MAJOR: Breaking changes (new DB schema, API changes)
MINOR: New features (new endpoints, RBAC enhancements)
PATCH: Bug fixes, security patches
```

### Dependency Updates
- **Security Patches**: Applied immediately (within 1 week)
- **Minor Updates**: Quarterly review, test, deploy
- **Major Updates**: Annual review, plan migration

---

## 🔐 Security Hardening

### Web.config Security Headers
```xml
<system.webServer>
  <httpProtocol>
    <customHeaders>
      <add name="X-Content-Type-Options" value="nosniff" />
      <add name="X-Frame-Options" value="DENY" />
      <add name="X-XSS-Protection" value="1; mode=block" />
      <add name="Strict-Transport-Security" value="max-age=31536000; includeSubDomains" />
      <add name="Content-Security-Policy" value="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';" />
      <remove name="X-Powered-By" />
    </customHeaders>
  </httpProtocol>
</system.webServer>
```

### Application Security Settings
```csharp
// Program.cs
builder.Services.AddAntiforgery(options =>
{
    options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
    options.Cookie.SameSite = SameSiteMode.Strict;
});

builder.Services.AddHsts(options =>
{
    options.MaxAge = TimeSpan.FromDays(365);
    options.IncludeSubDomains = true;
});
```

---

## 📊 Performance Benchmarks

### Target Metrics

| Metric | Target | Measured |
|--------|--------|----------|
| **Cold Start** | < 3s | TBD |
| **Avg Response** | < 500ms | TBD |
| **P95 Response** | < 2s | TBD |
| **Memory Usage** | < 200 MB | TBD |
| **CPU Usage** | < 10% (idle) | TBD |

**Methodology**: Load testing with 50 concurrent users (Phase 2)

---

## 🔗 References

### Official Documentation
- [ASP.NET Core Docs](https://docs.microsoft.com/en-us/aspnet/core)
- [C# Language Reference](https://docs.microsoft.com/en-us/dotnet/csharp/)
- [Serilog Wiki](https://github.com/serilog/serilog/wiki)
- [Polly Docs](https://www.pollydocs.org/)

### Architecture Patterns
- [Clean Architecture (Uncle Bob)](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Microsoft Architecture Guides](https://docs.microsoft.com/en-us/dotnet/architecture/)

---

**Document Status**: ✅ Complete  
**Next Review**: Phase 2 Planning (Q2 2026)
