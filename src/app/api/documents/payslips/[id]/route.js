import fs from "node:fs";
import path from "node:path";
import { withRoute } from "@/lib/api";

export const GET = withRoute({ permission: "payroll.view" }, async ({ params }) => {
  const absolutePath = path.join(process.cwd(), "storage", "payslips", `${params.id}.pdf`);
  if (!fs.existsSync(absolutePath)) {
    return new Response("Not Found", { status: 404 });
  }

  const fileBuffer = fs.readFileSync(absolutePath);
  return new Response(fileBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename=\"${params.id}.pdf\"`,
    },
  });
});
