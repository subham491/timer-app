import { lazy, Suspense } from 'react';

import { Box, CircularProgress, Stack, Typography } from '@mui/material';

import {
  ProjectsToolbar,
} from '@/features/projects/components';
import { useProjectsPageState } from '@/features/projects/hooks';

import { pageRootSx } from '@/features/projects/components/projectsPage.styles';

const ProjectsTable = lazy(
  () => import('@/features/projects/components/ProjectsTable')
);

const ProjectFormDrawer = lazy(
  () => import('@/features/projects/components/ProjectFormDrawer')
);

const ProjectDetailDrawer = lazy(
  () => import('@/features/projects/components/ProjectDetailDrawer')
);

const tableFallbackSx = {
  minHeight: 320,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '1px solid',
  borderColor: 'divider',
  backgroundColor: 'background.paper',
};

const drawerFallbackSx = {
  position: 'fixed',
  right: 0,
  top: 0,
  bottom: 0,
  width: { xs: '100%', sm: 420 },
  px: 2,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'background.paper',
  borderLeft: '1px solid',
  borderColor: 'divider',
  zIndex: 1200,
};

const ProjectsPage = () => {
  const state = useProjectsPageState();

  return (
    <Stack sx={pageRootSx}>
      <ProjectsToolbar
        onOpenCreate={state.onOpenCreate}
        onSearchTextChange={state.onSearchTextChange}
        onStatusChange={state.onStatusChange}
        searchText={state.searchText}
        statusFilters={state.statusFilters}
        userRole={state.userRole}
      />

      <Suspense
        fallback={
          <Box sx={tableFallbackSx}>
            <Stack spacing={1} sx={{ alignItems: 'center' }}>
              <CircularProgress size={22} />
              <Typography variant="body2" color="text.secondary">
                Loading projects
              </Typography>
            </Stack>
          </Box>
        }
      >
        <ProjectsTable
          getProjectPermissions={state.getProjectPermissions}
          onArchiveProject={state.onArchiveProject}
          onEditProject={state.onOpenEdit}
          onOpenProject={state.onOpenProject}
          onRestoreProject={state.onRestoreProject}
          rows={state.projectRows}
        />
      </Suspense>

      <Suspense
        fallback={
          state.isDrawerOpen ? (
            <Box sx={drawerFallbackSx}>
              <Stack spacing={1} sx={{ alignItems: 'center' }}>
                <CircularProgress size={22} />
                <Typography variant="body2" color="text.secondary">
                  Loading project form
                </Typography>
              </Stack>
            </Box>
          ) : null
        }
      >
        <ProjectFormDrawer
          draft={state.draft}
          drawerMode={state.drawerMode}
          isOpen={state.isDrawerOpen}
          onAssignmentUserIdsChange={state.onAssignmentUserIdsChange}
          onClose={state.onCloseDrawer}
          onDescriptionChange={state.onDescriptionChange}
          onDraftStatusChange={state.onDraftStatusChange}
          onNameChange={state.onNameChange}
          onProjectManagerUserIdsChange={state.onProjectManagerUserIdsChange}
          onSave={state.onSaveProject}
          onTasksChange={state.onTasksChange}
          users={state.users}
        />
      </Suspense>

      <Suspense fallback={null}>
        <ProjectDetailDrawer
          isOpen={state.selectedProject != null}
          onArchiveProject={state.onArchiveProject}
          onClose={state.onCloseProjectDetail}
          onEditProject={state.onOpenEdit}
          onRestoreProject={state.onRestoreProject}
          permissions={state.selectedProjectPermissions}
          project={state.selectedProject}
        />
      </Suspense>
    </Stack>
  );
};

export default ProjectsPage;
