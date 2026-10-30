import { getAllUsers } from '@/lib/db/users-repo';
import { getAllStaffLeads, getStaffPlatformMetrics } from '@/lib/db/staff-repo';
import { getAllInternApplications } from '@/lib/db/intern-repo';

const users = getAllUsers();
console.log(`\n=== ALL SEEDED USERS (${users.length}) ===`);
for (const u of users) {
  console.log(`- [${u.role.toUpperCase()}] ${u.name} | ID/Email: ${u.email} | Status: ${u.verificationStatus}`);
}

const apps = getAllInternApplications();
console.log(`\n=== INTERN APPLICATIONS (${apps.length}) ===`);
for (const a of apps) {
  console.log(`- Candidate: ${a.userName} (${a.userEmail}) | Status: ${a.status} | Score: ${a.interviewScore ?? 'N/A'} | Receipt: ${a.depositReceipt ?? 'Pending'}`);
}

const leads = getAllStaffLeads();
console.log(`\n=== STAFF (BDA) PARTNER LEADS (${leads.length}) ===`);
for (const l of leads) {
  console.log(`- ${l.leadName} (${l.region}) | Stage: ${l.pipelineStage.toUpperCase()} | Value: ₹${(l.estimatedValueINR || 0).toLocaleString('en-IN')}`);
}

const metrics = getStaffPlatformMetrics();
console.log(`\n=== PLATFORM BDA METRICS ===`);
console.log(metrics);
