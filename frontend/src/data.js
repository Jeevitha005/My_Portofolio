// Single source of truth. Add a project by appending to `projects`.
export const profile = {
  name: "Jeevitha J", title: "Software Developer",
  email: "jeevijaisankar01@gmail.com", phone: "8667025406", location: "Thimiri",
  github: "https://github.com/Jeevitha005",
  linkedin: "https://linkedin.com/in/jeevitha-j-781a67338",
  summary: "Final-year Computer Science and Engineering student with hands-on experience in Java, Python, and SQL, gained through two internships and several web application projects. I build with Spring Boot, Flask, and the MERN stack, and I'm looking for an entry-level Software Development Engineer role.",
};
export const skills = {
  "Programming Languages": ["Java", "Python", "C", "JavaScript", "SQL"],
  "Web & Application Development": ["Spring Boot", "Flask", "React.js", "Node.js", "Express.js", "HTML", "CSS", "Bootstrap"],
  "Databases": ["MySQL", "SQLite", "MongoDB"],
  "Software Engineering": ["OOP", "Data Structures & Algorithms", "REST APIs", "Debugging", "Software Testing"],
  "DevOps & Tools": ["Git", "GitHub", "Docker", "CI/CD", "Linux", "Jira", "Figma", "Google Colab", "Power BI", "MS Excel"],
};
export const projects = [
  { title: "Job Portal Application", period: "Jun 2026 – Aug 2026", stack: ["Java", "Spring Boot", "Spring Security", "Hibernate", "MySQL", "Maven"],
    description: "A recruitment platform with role-based access control for job seekers and recruiters.",
    features: ["REST APIs for job postings, candidate applications, job search, and application-status tracking", "Explainable skill-matching module that shows matching and missing skills against job requirements"] },
  { title: "Online Ticket Booking System", period: "Nov 2025 – Dec 2025", stack: ["React", "Node.js", "Express.js", "MongoDB", "Tailwind CSS", "Socket.IO"],
    description: "A full-stack ticket booking application with event listings, interactive seat selection, and booking history.",
    features: ["Seat availability validation and booking safeguards to prevent duplicate reservations", "Socket.IO keeps seat availability in sync across connected users in real time"] },
  { title: "Library Management System", period: "Jun 2025 – Jul 2025", stack: ["Python", "Flask", "SQLite", "Bootstrap", "Google Books API"],
    description: "A library application covering book inventory, student records, issue/return tracking, and fine calculation.",
    features: ["ISBN-based lookup through the Google Books API to fetch book metadata for catalog registration", "Book search, availability tracking, and administrative controls"] },
  { title: "Employee Leave Management System with CI/CD", period: "In progress", stack: ["Python", "Flask", "SQLite", "Pytest", "Docker", "GitHub Actions", "Linux", "Nginx"],
    description: "A leave management application with leave requests, approval workflows, and status tracking.",
    features: ["GitHub Actions pipeline to automate tests and Docker image builds (being configured)", "Linux deployment with Nginx, health checks, and log monitoring (planned)"] },
];
export const experience = [
  { role: "Java Full Stack Developer Intern", org: "TVK Technologies", place: "Chennai", period: "Jul 2026 – Aug 2026",
    points: ["Developed a Java-based Job Portal application for managing job listings and recruitment activities.", "Applied object-oriented principles to structure application logic and core recruitment workflows.", "Built user interfaces with HTML, CSS, and JavaScript; performed SQL operations on job listings and application records.", "Debugged and functionally tested the application to verify behavior."] },
  { role: "Full Stack Developer Intern", org: "RedBack IT Solutions", place: "Vellore", period: "Jun 2025 – Jul 2025",
    points: ["Developed and optimized responsive web application features using JavaScript, HTML, CSS, and Python.", "Implemented and tested features, debugging and resolving issues to improve reliability.", "Used Git and GitHub for version control while collaborating with team members."] },
];
export const education = [
  { degree: "Bachelor of Engineering — Computer Science & Engineering", school: "C. Abdul Hakeem College of Engineering and Technology, Melvisharam", period: "Aug 2023 – Jul 2027", note: "CGPA: 8.4" },
  { degree: "Higher Secondary Certificate", school: "Government Girls Higher Secondary School, Thimiri", period: "Jul 2021 – Jul 2023" },
];
export const certs = [
  { name: "Advanced Software Engineering Job Simulation", by: "Walmart (Forage)", date: "In progress" },
  { name: "CyberSecurity", by: "Google Skills Academic-NM", date: "Mar 2026" },
  { name: "MS Excel, HTML/CSS, DSA, JS", by: "Infosys Springboard", date: "Jun 2024" },
];
