const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// Counter for generating sequential IDs
let idCounter = 100;

/**
 * Generates a unique identifier with the specified prefix and optional suffix
 * @param {string} prefix - Prefix for the identifier
 * @param {string} suffix - Optional suffix for the identifier
 * @returns {string} - The generated identifier
 */
function generateId(prefix = 'I_', suffix = '') {
  // Get the next ID and increment the counter
  const nextId = idCounter++;
  return `${prefix}${nextId}${suffix}`;
}

/**
 * Creates a zip file of the cartridge with .imscc extension
 * @param {string} sourcePath - Path to the directory to be zipped
 * @param {string} outputFilename - Path to the output zip file (without extension)
 * @returns {Promise} - Promise that resolves when the zip is complete
 */
function createCartridgePackage(sourcePath, outputFilename) {
  return new Promise((resolve, reject) => {
    // Ensure the output directory exists
    const outputDir = path.dirname(outputFilename);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Create a file to stream archive data to
    const output = fs.createWriteStream(`${outputFilename}.imscc`);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Sets the compression level
    });

    // Listen for all archive data to be written
    output.on('close', () => {
      console.log(`Cartridge package created: ${outputFilename}.imscc`);
      console.log(`Total bytes: ${archive.pointer()}`);
      resolve();
    });

    // Good practice to catch warnings
    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') {
        console.warn(err);
      } else {
        reject(err);
      }
    });

    // Good practice to catch this error explicitly
    archive.on('error', (err) => {
      reject(err);
    });

    // Pipe archive data to the file
    archive.pipe(output);

    // Append files from a directory
    archive.directory(sourcePath, false);

    // Finalize the archive (i.e., we are done appending files)
    archive.finalize();
  });
}

/**
 * Generates the IMS manifest XML from a JSON structure
 * @param {Object} courseData - Course structure in JSON format
 * @param {string} outputPath - Path to write the output file
 * @param {boolean} createPackage - Whether to create a zip package
 * @returns {Promise<string>} - The generated XML content
 */
function generateManifest(courseData, outputPath, createPackage = true) {
  // Reset ID counter for each manifest generation
  idCounter = 100;
  
  const manifestId = generateId('M_', '');
  const organizationId = generateId('O_', '');
  
  // Track all resources to generate the resources section
  const resources = [];
  
  // Generate the items structure recursively
  function generateItems(items, parentId = 'root') {
    let itemsXml = '';
    
    items.forEach(item => {
      // First, handle the content item
      if (item.launchUrl) {
        // Generate ID for the content item
        const itemId = generateId();
        const contentResourceId = `${itemId}_R`;
        // Extract the numeric part from the itemId to use in folder name
        const idNumber = itemId.replace('I_', '');
        const contentFolderName = `i_${idNumber}`.toLowerCase();
        
        // Add to resources list for content
        resources.push({
          id: contentResourceId,
          folderName: contentFolderName,
          launchUrl: item.launchUrl,
          title: item.title,
          isAssessment: false
        });
        
        // Create the content resource item
        itemsXml += `
        <item identifier="${itemId}" identifierref="${contentResourceId}">
          <title>${item.title}</title>
        </item>`;
        
        // Now, create a separate item for assessment if it exists
        if (item.assessmentUrl) {
          // Generate a new ID for the assessment item
          const assessmentItemId = generateId();
          const assessmentResourceId = `${assessmentItemId}_R`;
          const assessmentIdNumber = assessmentItemId.replace('I_', '');
          const assessmentFolderName = `i_${assessmentIdNumber}`.toLowerCase();
          
          // Get the assessment title
          const assessmentTitle = item.assessmentTitle || 
                                `${item.title} ${item.assessmentMetadata?.type === 'exam' ? 'Exam' : 'Quiz'}`;
          
          // Add to resources list for assessment
          resources.push({
            id: assessmentResourceId,
            folderName: assessmentFolderName,
            launchUrl: item.assessmentUrl,
            title: assessmentTitle,
            isAssessment: true,
            metadata: item.assessmentMetadata || {}
          });
          
          // Create the assessment item immediately after the content item
          itemsXml += `
        <item identifier="${assessmentItemId}" identifierref="${assessmentResourceId}">
          <title>${assessmentTitle}</title>
        </item>`;
        }
      } else {
        // This is a container item with children
        const itemId = generateId();
        const childrenXml = item.children ? generateItems(item.children) : '';
        
        itemsXml += `
        <item identifier="${itemId}">
          <title>${item.title}</title>${childrenXml}
        </item>`;
      }
    });
    
    return itemsXml;
  }
  
  // Generate the resources XML
  function generateResourcesXml() {
    let resourcesXml = '';
    
    resources.forEach(resource => {
      // For content resources (basic LTI)
      if (!resource.isAssessment) {
        resourcesXml += `
          <resource identifier="${resource.id}" type="imsbasiclti_xmlv1p0">
              <file href="${resource.folderName}/basiclti.xml"/>
          </resource>`;
        
        // Create the folder and basic LTI XML file
        if (outputPath) {
          const folderPath = path.join(path.dirname(outputPath), resource.folderName);
          if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
          }
          
          // Generate the basiclti.xml content for regular content
          const basicLtiXml = generateBasicLtiXml(resource.launchUrl, resource.title);
          fs.writeFileSync(path.join(folderPath, 'basiclti.xml'), basicLtiXml);
        }
      } 
      // For assessment resources (LTI Advantage)
      else {
        resourcesXml += `
          <resource identifier="${resource.id}" type="imsbasiclti_xmlv1p0">
              <file href="${resource.folderName}/lti_advantage.xml"/>
          </resource>`;
        
        // Create the folder and LTI Advantage XML file
        if (outputPath) {
          const folderPath = path.join(path.dirname(outputPath), resource.folderName);
          if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
          }
          
          // Generate the LTI Advantage XML content for assessments
          const ltiAdvantageXml = generateLtiAdvantageXml(
            resource.launchUrl, 
            resource.title, 
            resource.metadata
          );
          fs.writeFileSync(path.join(folderPath, 'lti_advantage.xml'), ltiAdvantageXml);
        }
      }
    });
    
    return resourcesXml;
  }
  
  // Generate basiclti.xml content (LTI 1.0/1.1)
  function generateBasicLtiXml(launchUrl, title) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<cartridge_basiclti_link xmlns="http://www.imsglobal.org/xsd/imslticc_v1p0"
    xmlns:blti="http://www.imsglobal.org/xsd/imsbasiclti_v1p0"
    xmlns:lticm="http://www.imsglobal.org/xsd/imslticm_v1p0"
    xmlns:lticp="http://www.imsglobal.org/xsd/imslticp_v1p0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.imsglobal.org/xsd/imslticc_v1p0 http://www.imsglobal.org/xsd/lti/ltiv1p0/imslticc_v1p0.xsd
    http://www.imsglobal.org/xsd/imsbasiclti_v1p0 http://www.imsglobal.org/xsd/lti/ltiv1p0/imsbasiclti_v1p0.xsd
    http://www.imsglobal.org/xsd/imslticm_v1p0 http://www.imsglobal.org/xsd/lti/ltiv1p0/imslticm_v1p0.xsd
    http://www.imsglobal.org/xsd/imslticp_v1p0 http://www.imsglobal.org/xsd/lti/ltiv1p0/imslticp_v1p0.xsd">
    <blti:title>${title || 'External Tool'}</blti:title>
    <blti:description>Basic LTI Launch</blti:description>
    <blti:launch_url>${launchUrl}</blti:launch_url>
    <blti:secure_launch_url>${launchUrl.replace('http://', 'https://')}</blti:secure_launch_url>
    <blti:vendor>
        <lticp:code>external_tool</lticp:code>
        <lticp:name>External Tool Provider</lticp:name>
    </blti:vendor>
    <cartridge_bundle identifierref="BLTI001_Bundle"/>
    <cartridge_icon identifierref="BLTI001_Icon"/>
</cartridge_basiclti_link>`;
  }
  
  // Generate LTI Advantage XML content (LTI 1.3)
  function generateLtiAdvantageXml(launchUrl, title, metadata = {}) {
    // Base XML structure
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<cartridge_basiclti_link xmlns="http://www.imsglobal.org/xsd/imslticc_v1p0"
    xmlns:blti="http://www.imsglobal.org/xsd/imsbasiclti_v1p0"
    xmlns:lticm="http://www.imsglobal.org/xsd/imslticm_v1p0"
    xmlns:lticp="http://www.imsglobal.org/xsd/imslticp_v1p0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.imsglobal.org/xsd/imslticc_v1p0 http://www.imsglobal.org/xsd/lti/ltiv1p0/imslticc_v1p0.xsd
    http://www.imsglobal.org/xsd/imsbasiclti_v1p0 http://www.imsglobal.org/xsd/lti/ltiv1p0/imsbasiclti_v1p0.xsd
    http://www.imsglobal.org/xsd/imslticm_v1p0 http://www.imsglobal.org/xsd/lti/ltiv1p0/imslticm_v1p0.xsd
    http://www.imsglobal.org/xsd/imslticp_v1p0 http://www.imsglobal.org/xsd/lti/ltiv1p0/imslticp_v1p0.xsd">
    <blti:title>${title || 'Assessment'}</blti:title>
    <blti:description>Assessment Launch via LTI Advantage</blti:description>
    <blti:launch_url>${launchUrl}</blti:launch_url>
    <blti:secure_launch_url>${launchUrl.replace('http://', 'https://')}</blti:secure_launch_url>
    <blti:vendor>
        <lticp:code>external_tool</lticp:code>
        <lticp:name>External Tool Provider</lticp:name>
    </blti:vendor>
    <blti:extensions platform="canvas.instructure.com">
        <lticm:property name="tool_id">lti_advantage_tool</lticm:property>
        <lticm:property name="privacy_level">public</lticm:property>
        <lticm:property name="lti_1_3_enabled">true</lticm:property>
        <lticm:property name="public_jwk_url">${launchUrl.replace(/\/[^\/]*$/, '/jwks')}</lticm:property>
        <lticm:property name="assignment_enabled">true</lticm:property>
        <lticm:property name="assignment_points_possible">${metadata.points || 10}</lticm:property>`;
    
    // Add specific assessment properties from metadata
    if (metadata.timeLimit) {
      xml += `
        <lticm:property name="time_limit">${metadata.timeLimit}</lticm:property>`;
    }
    
    if (metadata.attempts) {
      xml += `
        <lticm:property name="allowed_attempts">${metadata.attempts}</lticm:property>`;
    }
    
    if (metadata.proctored) {
      xml += `
        <lticm:property name="proctoring_enabled">true</lticm:property>`;
    }
    
    if (metadata.passingScore) {
      xml += `
        <lticm:property name="passing_score">${metadata.passingScore}</lticm:property>`;
    }
    
    // Complete the XML
    xml += `
        <lticm:property name="settings">
            <lticm:property name="oidc_initiation_url">${launchUrl.replace(/\/[^\/]*$/, '/init')}</lticm:property>
        </lticm:property>
    </blti:extensions>
    <cartridge_bundle identifierref="BLTI001_Bundle"/>
    <cartridge_icon identifierref="BLTI001_Icon"/>
</cartridge_basiclti_link>`;

    return xml;
  }
  
  // Generate the full XML
  const itemsXml = generateItems(courseData.modules);
  
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<manifest xmlns="http://www.imsglobal.org/xsd/imsccv1p1/imscp_v1p1"
    xmlns:lomimscc="http://ltsc.ieee.org/xsd/imsccv1p1/LOM/manifest"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" identifier="${manifestId}" xsi:schemaLocation="http://www.imsglobal.org/xsd/imsccv1p1/imscp_v1p1 http://www.imsglobal.org/profile/cc/ccv1p1/ccv1p1_imscp_v1p2_v1p0.xsd http://ltsc.ieee.org/xsd/imsccv1p1/LOM/manifest http://www.imsglobal.org/profile/cc/ccv1p1/LOM/ccv1p1_lommanifest_v1p0.xsd http://ltsc.ieee.org/xsd/imsccv1p1/LOM/resource http://www.imsglobal.org/profile/cc/ccv1p1/LOM/ccv1p1_lomresource_v1p0.xsd">
    <metadata>
        <schema>IMS Common Cartridge</schema>
        <schemaversion>1.1.0</schemaversion>
        <lomimscc:lom>
            <lomimscc:general>
                <lomimscc:title>
                    <lomimscc:string language="en">${courseData.title}</lomimscc:string>
                </lomimscc:title>
                <lomimscc:language>en</lomimscc:language>
                <lomimscc:description>
                    <lomimscc:string language="en">${courseData.description || ''}</lomimscc:string>
                </lomimscc:description>
                <lomimscc:identifier>
                    <lomimscc:catalog>category</lomimscc:catalog>
                    <lomimscc:entry>${courseData.category || 'Hybrid Hosting'}</lomimscc:entry>
                </lomimscc:identifier>
            </lomimscc:general>
        </lomimscc:lom>
    </metadata>
    <organizations>
        <organization identifier="${organizationId}" structure="rooted-hierarchy">
            <item identifier="root">${itemsXml}
            </item>
        </organization>
    </organizations>
    <resources>${generateResourcesXml()}
    </resources>
</manifest>`;

  // Write the manifest file if an output path is provided
  if (outputPath) {
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    fs.writeFileSync(outputPath, xml);
  }
  
  // Create a zip package if requested
  if (createPackage && outputPath) {
    const cartridgeDir = path.dirname(outputPath);
    const zipOutputBase = path.join(
      path.dirname(cartridgeDir),
      path.basename(cartridgeDir)
    );
    return createCartridgePackage(cartridgeDir, zipOutputBase)
      .then(() => xml);
  }
  
  return Promise.resolve(xml);
}

module.exports = {
  generateManifest
}; 