export const profile = {
  name: 'Sean',
  title: 'Software Engineer',
  tagline: '9+ years building distributed systems, developer tooling, and products at scale.',
  bio: [
    'I\'m a software engineer with over nine years of experience across backend systems, infrastructure, and developer tooling. I care deeply about clean architecture, operational simplicity, and shipping things that matter.',
    'Outside of work I spend time on personal infrastructure, open source, and the occasional side project that refuses to stay side.',
  ],
  location: 'Remote',
  availability: 'Open to interesting projects and conversations.',
  links: {
    github: 'https://github.com/sean',     // update
    linkedin: 'https://linkedin.com/in/sean', // update
    email: 'hello@seanhoots.com',             // update
    blog: '/blog',
  },
} as const;

export type Profile = typeof profile;
