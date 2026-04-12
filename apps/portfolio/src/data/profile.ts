export const profile = {
  name: 'Sean Lavoie',
  handle: 'seanlavoie',
  title: 'Software Engineer',
  tagline: '9+ years building distributed systems, developer tooling, and products at scale.',
  bio: [
    'I\'m a software engineer with over nine years of experience across backend systems, infrastructure, and developer tooling. I care deeply about clean architecture, operational simplicity, and shipping things that matter.',
    'Outside of work I spend time on personal infrastructure, open source, and the occasional side project that refuses to stay side.',
  ],
  location: 'Remote',
  availability: 'Open to interesting projects and conversations.',
  links: {
    github: 'https://github.com/seanlavoie',
    linkedin: 'https://linkedin.com/in/seanlavoie', // verify — update if URL slug differs
    email: 'seanlavoie@gmail.com',                  // update to domain email once hello@seanlavoie.com is configured
    // GitHub Pages path — change to '/blog' when custom domain is active
    blog: '/seanlavoie/blog',
  },
} as const;

export type Profile = typeof profile;
