import { switchRole } from "@/app/actions/switch-role";
import type { SwitchOption } from "@/lib/myRoles";

/**
 * "Switch workspace" for staff who hold more than one role. Shown in the side menu.
 * Each workspace keeps its own menu and permissions; switching moves the person between them.
 */
export default function RoleSwitcher({ options }: { options: SwitchOption[] }) {
  if (options.length < 2) return null;
  return (
    <div className="role-switch" aria-label="Switch workspace">
      <div className="small muted" style={{ marginBottom: 6 }}>Switch workspace</div>
      <div className="role-switch-list">
        {options.map((o) =>
          o.active ? (
            <span key={o.role} className="role-switch-item on" aria-current="true">
              <span className="dot" aria-hidden="true" />{o.label}
            </span>
          ) : (
            <form key={o.role} action={switchRole}>
              <input type="hidden" name="role" value={o.role} />
              <button className="role-switch-item" type="submit">
                <span className="dot" aria-hidden="true" />{o.label}
              </button>
            </form>
          ),
        )}
      </div>
    </div>
  );
}
