const { generateManifest } = require('./cartridgeGenerator');

// Example course structure
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
          launchUrl: "https://example.com/chinese1/module1/pretest"
        },
        {
          title: "01.01 Greetings and Introductions",
          launchUrl: "https://example.com/chinese1/module1/greetings"
        },
        {
          title: "01.02 Call Me Maybe",
          launchUrl: "https://example.com/chinese1/module1/call-me"
        }
      ]
    }
  ]
};

// Generate the manifest file and package
const outputPath = 'output/chinese1C/imsmanifest.xml';
generateManifest(chineseCourse, outputPath, true)
  .then(() => {
    console.log(`Generated Common Cartridge at ${outputPath}`);
    console.log(`Packaged as ${outputPath.replace('imsmanifest.xml', '')}.imscc`);
  })
  .catch(err => {
    console.error('Error generating cartridge:', err);
  }); 