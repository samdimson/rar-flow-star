import { createFileRoute } from "@tanstack/react-router";

const SEED = [
  { full_name: "Kweke Brown-Acquaye", email: "kba@riseaboveroofingok.com", role: "sales_rep" as const },
  { full_name: "Sam Dimson", email: "sdimson@riseaboveroofingok.com", role: "sales_rep" as const },
];

export const Route = createFileRoute("/api/public/seed-users")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const results: unknown[] = [];
        const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        for (const person of SEED) {
          let id = list?.users.find((u) => u.email?.toLowerCase() === person.email)?.id;
          if (!id) {
            const { data, error } = await supabaseAdmin.auth.admin.createUser({
              email: person.email,
              password: crypto.randomUUID() + "Aa1!",
              email_confirm: true,
              user_metadata: { full_name: person.full_name },
            });
            if (error) {
              results.push({ email: person.email, error: error.message });
              continue;
            }
            id = data.user?.id;
          }
          if (!id) continue;
          await supabaseAdmin
            .from("profiles")
            .upsert({ id, full_name: person.full_name, email: person.email }, { onConflict: "id" });
          await supabaseAdmin
            .from("user_roles")
            .upsert({ user_id: id, role: person.role }, { onConflict: "user_id,role" });
          await supabaseAdmin.from("user_roles").delete().eq("user_id", id).neq("role", person.role);
          results.push({ email: person.email, id });
        }
        return new Response(JSON.stringify(results), {
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
