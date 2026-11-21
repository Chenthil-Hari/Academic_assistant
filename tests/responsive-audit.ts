import { chromium } from "playwright";

const VIEWPORTS = [
  { name: "Small phone", width: 320, height: 568 },
  { name: "iPhone-sized phone", width: 375, height: 812 },
  { name: "Large phone", width: 430, height: 932 },
  { name: "Small tablet", width: 500, height: 768 },
  { name: "Tablet", width: 768, height: 1024 },
  { name: "Laptop", width: 1024, height: 768 },
  { name: "Standard laptop", width: 1366, height: 768 },
  { name: "Desktop", width: 1440, height: 900 },
  { name: "Large desktop", width: 1920, height: 1080 },
];

const PAGES = [
  { path: "/", auth: false },
  { path: "/auth/login", auth: false },
  { path: "/auth/signup", auth: false },
  { path: "/auth/forgot-password", auth: false },
  { path: "/dashboard", auth: true },
  { path: "/attendance", auth: true },
  { path: "/timetable", auth: true },
  { path: "/calendar", auth: true },
  { path: "/ai-assistant", auth: true },
  { path: "/upload", auth: true },
  { path: "/reports", auth: true },
  { path: "/settings", auth: true },
];

async function runAudit() {
  console.log("=== STARTING RESPONSIVE AUDIT ACROSS 9 VIEWPORTS ===");
  let browser;
  try {
    browser = await chromium.launch({ headless: true, channel: "msedge" });
  } catch (e) {
    try {
      browser = await chromium.launch({ headless: true, channel: "chrome" });
    } catch (e2) {
      browser = await chromium.launch({ headless: true });
    }
  }
  const context = await browser.newContext();

  // Create an authenticated session
  console.log("Creating test session...");
  const page = await context.newPage();
  
  // Try signup or login with test user
  const testEmail = `test_${Date.now()}@academic.ai`;
  const testPassword = "Password123!";

  try {
    const signupRes = await page.request.post("http://localhost:3000/api/auth/signup", {
      data: {
        name: "Responsive Test Student",
        email: testEmail,
        password: testPassword,
        college: "Engineering College",
        branch: "Computer Science",
        semester: 4,
        targetAttendancePercentage: 75,
      },
    });
    const signupData = await signupRes.json();
    if (!signupData.success) {
      console.log("Signup note:", signupData.message);
    }
  } catch (err: any) {
    console.log("Auth setup warning:", err.message);
  }

  let totalTests = 0;
  let passedTests = 0;
  const issues: string[] = [];

  for (const vp of VIEWPORTS) {
    console.log(`\n--- Testing Viewport: ${vp.name} (${vp.width}x${vp.height}) ---`);

    for (const pg of PAGES) {
      totalTests++;
      const testPage = await context.newPage();
      await testPage.setViewportSize({ width: vp.width, height: vp.height });

      try {
        await testPage.goto(`http://localhost:3000${pg.path}`, {
          waitUntil: "domcontentloaded",
          timeout: 15000,
        });

        // Wait a brief moment for hydration
        await testPage.waitForTimeout(500);

        // Check horizontal overflow
        const overflowData = await testPage.evaluate(() => {
          const docEl = document.documentElement;
          const body = document.body;
          const windowWidth = window.innerWidth;
          const docScrollWidth = docEl.scrollWidth;
          const bodyScrollWidth = body ? body.scrollWidth : 0;

          // Find any element causing overflow
          const overflowingElements: string[] = [];
          const allElements = document.querySelectorAll("*");
          allElements.forEach((el) => {
            const rect = el.getBoundingClientRect();
            if (rect.right > windowWidth + 1) { // 1px threshold for rounding
              const tag = el.tagName.toLowerCase();
              const cls = typeof el.className === "string" ? el.className.slice(0, 30) : "";
              overflowingElements.push(`${tag}.${cls} (right: ${Math.round(rect.right)}px > ${windowWidth}px)`);
            }
          });

          return {
            windowWidth,
            docScrollWidth,
            bodyScrollWidth,
            hasDocOverflow: docScrollWidth > windowWidth,
            hasBodyOverflow: bodyScrollWidth > windowWidth,
            overflowCount: overflowingElements.length,
            sampleOverflow: overflowingElements.slice(0, 3),
          };
        });

        if (!overflowData.hasDocOverflow && !overflowData.hasBodyOverflow) {
          passedTests++;
          process.stdout.write(`  ✓ ${pg.path.padEnd(24)}: No overflow (scrollWidth=${overflowData.docScrollWidth}px <= ${vp.width}px)\n`);
        } else {
          const err = `[FAIL] ${vp.name} (${vp.width}px) on ${pg.path}: docScrollWidth=${overflowData.docScrollWidth}px vs viewport=${vp.width}px. Sample: ${overflowData.sampleOverflow.join(", ")}`;
          issues.push(err);
          console.error(`  ✗ ${err}`);
        }
      } catch (err: any) {
        issues.push(`[ERROR] ${vp.name} on ${pg.path}: ${err.message}`);
        console.error(`  ✗ [ERROR] ${pg.path}: ${err.message}`);
      } finally {
        await testPage.close();
      }
    }
  }

  await browser.close();

  console.log(`\n========================================`);
  console.log(`AUDIT COMPLETE: ${passedTests}/${totalTests} checks passed.`);
  if (issues.length === 0) {
    console.log("🎉 ALL PAGES PASSED ZERO HORIZONTAL OVERFLOW ACROSS ALL 9 VIEWPORTS!");
  } else {
    console.log(`Issues found (${issues.length}):`);
    issues.forEach((i) => console.log(" - " + i));
  }
}

runAudit().catch(console.error);
