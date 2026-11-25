# Initial content taken from the resume. Loaded once by `flask --app app seed`; afterwards edit via the dashboard.
PROJECTS = [
 dict(title="Job Portal Application", period="Jun 2026 – Aug 2026", stack=["Java","Spring Boot","Spring Security","Hibernate","MySQL","Maven"],
  description="A recruitment platform with role-based access control for job seekers and recruiters.",
  features=["REST APIs for job postings, candidate applications, job search, and application-status tracking","Explainable skill-matching module that shows matching and missing skills against job requirements"]),
 dict(title="Online Ticket Booking System", period="Nov 2025 – Dec 2025", stack=["React","Node.js","Express.js","MongoDB","Tailwind CSS","Socket.IO"],
  description="A full-stack ticket booking application with event listings, interactive seat selection, and booking history.",
  features=["Seat availability validation and booking safeguards to prevent duplicate reservations","Socket.IO keeps seat availability in sync across connected users in real time"]),
 dict(title="Library Management System", period="Jun 2025 – Jul 2025", stack=["Python","Flask","SQLite","Bootstrap","Google Books API"],
  description="A library application covering book inventory, student records, issue/return tracking, and fine calculation.",
  features=["ISBN-based lookup through the Google Books API to fetch book metadata for catalog registration","Book search, availability tracking, and administrative controls"]),
 dict(title="Employee Leave Management System with CI/CD", period="In progress", stack=["Python","Flask","SQLite","Pytest","Docker","GitHub Actions","Linux","Nginx"],
  description="A leave management application with leave requests, approval workflows, and status tracking.",
  features=["GitHub Actions pipeline to automate tests and Docker image builds (being configured)","Linux deployment with Nginx, health checks, and log monitoring (planned)"]),
]
CONTENT = {
 "about": "I'm completing my B.E. in Computer Science & Engineering (CGPA 8.4, graduating 2027). My strongest ground is Java, Python, and SQL. I've built a Spring Boot job portal with role-based access, a MERN ticket booking app with real-time seat updates, and a Flask library system that pulls book data from the Google Books API.\n\nTwo internships taught me to debug, test, and work in a shared Git codebase. I'm currently learning CI/CD and Docker by building a leave management system with automated tests and image builds. I'm looking for an entry-level Software Development Engineer role.",
 "skills": {
  "Programming Languages": ["Java","Python","C","JavaScript","SQL"],
  "Web & Application Development": ["Spring Boot","Flask","React.js","Node.js","Express.js","HTML","CSS","Bootstrap"],
  "Databases": ["MySQL","SQLite","MongoDB"],
  "Software Engineering": ["OOP","Data Structures & Algorithms","REST APIs","Debugging","Software Testing"],
  "DevOps & Tools": ["Git","GitHub","Docker","CI/CD","Linux","Jira","Figma","Google Colab","Power BI","MS Excel"]},
}
