// Interface para o Projeto
export interface Project {
  id: number;
  name: string;
  SubProjects?: SubProject[];
  totalIssues?: number;
  openedOnTime?: number;
  overdue?: number;
  closed?: number;
}

export interface SubProject {
    id: number;
    name: string;
  }
  // Interface para a Issue
  export interface Issue {
    id: number;
    title: string;
    state: string; // Ex: 'opened', 'closed', 'in_progress', 'testing'
    labels: string[];
    due_date?: string; // Data de vencimento da issue, se houver
  }
  
  // Interface para o Status das Issues (contagem por estado)
  export interface StatusCount {
    opened: number;
    closed: number;
    
    
  }
  