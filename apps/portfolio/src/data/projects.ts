export interface Project {
  title: string;
  description: string;
  tags: string[];
  url?: string;
  repo?: string;
  featured: boolean;
  status: 'active' | 'archived' | 'wip';
}

export const projects: Project[] = [
  {
    title: 'Personal Site & Blog',
    description:
      'This site — a monorepo housing a portfolio and blog, built with Astro and Tailwind, deployed to GitHub Pages. Clean static output, zero client JS by default.',
    tags: ['Astro', 'TypeScript', 'Tailwind', 'pnpm workspaces'],
    repo: 'https://github.com/seanlavoie/seanlavoie',
    url: 'https://seanlavoie.com',
    featured: true,
    status: 'active',
  },
  // Add more projects here
];

export const featuredProjects = projects.filter((p) => p.featured);
