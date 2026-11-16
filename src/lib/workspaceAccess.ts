type WorkspaceUser = {
 portal: string;
 grants?: string[];
 setup_grants?: string[];
 renewal_blocks?: unknown[];
};

const companyPortals = ['admin', 'md', 'finance'];

export function signInOverviewPath(user: WorkspaceUser): string | null {
 if (user.portal === 'developer') return '/developer';
 if (user.renewal_blocks?.length || !user.grants?.includes('view_orders')) return null;
 return '/' + user.portal + (companyPortals.includes(user.portal) ? '/operations' : '');
}

// Choose only a workspace already permitted by the API's effective grants.
// Explicitly empty permissions remain empty; routing never grants access.
export function workspaceRedirect(user: WorkspaceUser, portal: string, workspace: 'companies' | 'operations'): string | null {
 const home = '/' + user.portal;
 const hasCompanyWorkspace = companyPortals.includes(user.portal);
 if (user.portal === 'developer') return home;
 if (user.grants?.includes('export_view') && !user.grants.includes('view_orders') &&
     !(hasCompanyWorkspace && user.setup_grants?.includes('view'))) return '/exports';
 if (!portal || portal !== user.portal) return home;
 if (workspace === 'operations' && !user.grants?.includes('view_orders') && hasCompanyWorkspace && user.setup_grants?.includes('view')) return home;
 if (workspace === 'companies' && !user.setup_grants?.includes('view') && user.grants?.includes('view_orders')) return home + '/operations';
 return null;
}
