export interface Role {
  company: string;
  title: string;
  period: string;
  description: string;
  highlights: string[];
  tags: string[];
}

export const experience: Role[] = [
  // Add work history here. Example shape:
  // {
  //   company: 'Acme Corp',
  //   title: 'Senior Software Engineer',
  //   period: '2022 – Present',
  //   description: 'Led backend platform work for a high-traffic distributed system.',
  //   highlights: [
  //     'Reduced p99 latency by 40% through query optimisation and caching strategy',
  //     'Designed and shipped async job processing pipeline handling 50K events/sec',
  //   ],
  //   tags: ['Go', 'Postgres', 'Kafka', 'Kubernetes'],
  // },
];
