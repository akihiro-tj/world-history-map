import { createContext, type ReactNode, useContext, useMemo, useState } from 'react';
import type { ProjectionType } from '../types/projection';

interface ProjectionContextValue {
  projection: ProjectionType;
  setProjection: (projection: ProjectionType) => void;
}

const ProjectionContext = createContext<ProjectionContextValue | null>(null);

interface ProjectionProviderProps {
  children: ReactNode;
}

export function ProjectionProvider({ children }: ProjectionProviderProps) {
  const [projection, setProjection] = useState<ProjectionType>('mercator');

  const value = useMemo(() => ({ projection, setProjection }), [projection]);

  return <ProjectionContext.Provider value={value}>{children}</ProjectionContext.Provider>;
}

export function useProjectionContext(): ProjectionContextValue {
  const context = useContext(ProjectionContext);
  if (!context) {
    throw new Error('useProjectionContext must be used within a ProjectionProvider');
  }
  return context;
}
