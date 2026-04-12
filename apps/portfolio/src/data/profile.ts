export const profile = {
  name: 'Sean Lavoie',
  handle: 'seanlavoie',
  title: 'Software Engineer',
  tagline:
    'Building secure, scalable systems — from data platforms and developer frameworks to agentic systems that make complex decisions.',
  careerPath: 'Box → Asana → Prophet Security → Placer AI',
  bio: [
    "I'm a software engineer with over eight years of experience across backend systems, infrastructure, and developer tooling. I care deeply about clean architecture, operational simplicity, and shipping things that matter.",
    'Outside of work I spend time on personal infrastructure, open source, and the occasional side project that refuses to stay side.',
  ],
  location: 'Bay Area',
  availability: 'Open to interesting projects and conversations.',
  links: {
    github: 'https://github.com/seanlavoie',
    linkedin: 'https://linkedin.com/in/seanlavoie',
    blog: '/blog',
  },
} as const;

export type Profile = typeof profile;
