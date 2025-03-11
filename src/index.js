const { generateManifest } = require('./cartridgeGenerator');

// Example course structure with content and assessment launches
const chineseCourse = {
  title: "Chinese I v21 (GS)",
  description: "",
  category: "Hybrid Hosting",
  modules: [
    {
      title: "Welcome",
      children: [
        {
          title: "eTeacher Guide",
          launchUrl: "https://example.com/chinese1/eteacher-guide"
        },
        {
          title: "Course Information",
          launchUrl: "https://example.com/chinese1/course-info"
        },
        {
          title: "Lessons",
          launchUrl: "https://example.com/chinese1/lessons"
        }
      ]
    },
    {
      title: "Getting Started",
      children: [
        {
          title: "00.01 Things to Know",
          launchUrl: "https://example.com/chinese1/getting-started/things-to-know"
        }
      ]
    },
    {
      title: "Module 01: My Life",
      children: [
        {
          title: "01.00 My Life Pretest",
          launchUrl: "https://example.com/chinese1/module1/pretest",
          assessmentUrl: "https://example.com/chinese1/module1/pretest/assessment",
          assessmentMetadata: {
            type: "pretest",
            points: 10,
            passingScore: 7
          }
        },
        {
          title: "01.01 Greetings and Introductions",
          launchUrl: "https://example.com/chinese1/module1/greetings",
          assessmentUrl: "https://example.com/chinese1/module1/greetings/assessment",
          assessmentMetadata: {
            type: "practice",
            points: 15
          }
        },
        {
          title: "01.02 Call Me Maybe",
          launchUrl: "https://example.com/chinese1/module1/call-me",
          assessmentUrl: "https://example.com/chinese1/module1/call-me/assessment",
          assessmentMetadata: {
            type: "practice",
            points: 15
          }
        },
        {
          title: "01.03 Module Assessment",
          launchUrl: "https://example.com/chinese1/module1/assessment",
          assessmentUrl: "https://example.com/chinese1/module1/final-assessment",
          assessmentMetadata: {
            type: "module_exam",
            points: 25,
            passingScore: 18,
            timeLimit: 60
          }
        }
      ]
    },
    {
      title: "Assessments",
      children: [
        {
          title: "Midterm Exam",
          launchUrl: "https://example.com/chinese1/assessments/midterm",
          assessmentUrl: "https://example.com/chinese1/assessments/midterm/launch",
          assessmentMetadata: {
            type: "midterm",
            points: 100,
            passingScore: 70,
            timeLimit: 120,
            attempts: 2
          }
        },
        {
          title: "Final Exam",
          launchUrl: "https://example.com/chinese1/assessments/final",
          assessmentUrl: "https://example.com/chinese1/assessments/final/launch",
          assessmentMetadata: {
            type: "final",
            points: 150,
            passingScore: 105,
            timeLimit: 180,
            attempts: 1,
            proctored: true
          }
        }
      ]
    }
  ]
};

// Generate the manifest file and package
const outputPath = 'output/chinese1D/imsmanifest.xml';
generateManifest(chineseCourse, outputPath, true)
  .then(() => {
    console.log(`Generated Common Cartridge at ${outputPath}`);
    console.log(`Packaged as ${outputPath.replace('imsmanifest.xml', '')}.imscc`);
  })
  .catch(err => {
    console.error('Error generating cartridge:', err);
  }); 