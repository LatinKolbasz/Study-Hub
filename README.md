# Study Hub App

## Overview
The Study Hub App is a web application designed to help users manage their assignments and study materials across various topics. It provides a simple yet modern interface for users to upload tasks, check them off when completed, and store study materials for different subjects.

## Features
- **Assignments Section**: Users can create, edit, and complete tasks with a name, description, and due date.
- **Sector Section**: Users can upload study materials for four different topics: NetAcad CCNA, Python, Web Development, and Cisco Packet Tracer.
- **Interactive Design**: The application includes animations and a modern design for an engaging user experience.
- **Local Storage**: Users can save their assignments and study materials, ensuring data persistence across sessions.

## Project Structure
```
study-hub-app
├── src
│   ├── index.html
│   ├── index.css
│   ├── index.js
│   ├── pages
│   │   ├── assignments.html
│   │   ├── assignments.css
│   │   ├── assignments.js
│   │   ├── sector.html
│   │   ├── sector.css
│   │   └── sector.js
│   ├── components
│   │   ├── navbar.js
│   │   ├── navbar.css
│   │   ├── modal.js
│   │   └── modal.css
│   ├── utils
│   │   ├── storage.js
│   │   └── animations.js
│   └── assets
│       └── data
│           └── topics.json
├── package.json
└── README.md
```

## Installation
1. Clone the repository:
   ```
   git clone <repository-url>
   ```
2. Navigate to the project directory:
   ```
   cd study-hub-app
   ```
3. Install the dependencies:
   ```
   npm install
   ```

## Usage
- Open `src/index.html` in your web browser to start using the application.
- Navigate between the Assignments and Sector sections using the navigation bar.
- Upload tasks and study materials as needed.

## Contributing
Contributions are welcome! Please submit a pull request or open an issue for any enhancements or bug fixes.

## License
This project is licensed under the MIT License.