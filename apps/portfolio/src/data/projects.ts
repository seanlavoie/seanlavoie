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
      'This site — a monorepo housing a portfolio and blog, built with Astro and Tailwind, deployed to static hosting. Clean output, zero client JS by default.',
    tags: ['Astro', 'TypeScript', 'Tailwind', 'pnpm workspaces'],
    repo: 'https://github.com/sean/personal-site', // update
    url: 'https://seanhoots.com',                  // update
    featured: true,
    status: 'active',
  },
  // Add more projects here
];

export const featuredProjects = projects.filter((p) => p.featured);
