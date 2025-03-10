const fs = require('fs');
const path = require('path');
const uuid = require('uuid');

/**
 * Generates a unique identifier with the specified prefix and optional suffix
 * @param {string} prefix - Prefix for the identifier
 * @param {string} suffix - Optional suffix for the identifier
 * @returns {string} - The generated identifier
 */
function generateId(prefix = 'I_', suffix = '') {
  // Generate a random alphanumeric string (6-8 chars)
  const randomId = uuid.v4().replace(/-/g, '').substring(0, 8).toUpperCase();
  return `${prefix}${randomId}${suffix}`;
}

/**
 * Generates the IMS manifest XML from a JSON structure
 * @param {Object} courseData - Course structure in JSON format
 * @param {string} outputPath - Path to write the output file
 * @returns {string} - The generated XML content
 */
function generateManifest(courseData, outputPath) {
  const manifestId = generateId('M_', '');
  const organizationId = generateId('O_', '');
  
  // Track all resources to generate the resources section
  const resources = [];
  
  // Generate the items structure recursively
  function generateItems(items, parentId = 'root') {
    let itemsXml = '';
    
    items.forEach(item => {
      const itemId = generateId();
      let itemXml = '';
      
      if (item.launchUrl) {
        // This is a leaf item with a launch URL
        const resourceId = `${itemId}_R`;
        const folderName = generateId('i_', '').toLowerCase();
        
        // Add to resources list
        resources.push({
          id: resourceId,
          folderName: folderName,
          launchUrl: item.launchUrl
        });
        
        itemXml = `
        <item identifier="${itemId}" identifierref="${resourceId}">
          <title>${item.title}</title>
        </item>`;
      } else {
        // This is a container item with children
        const childrenXml = item.children ? generateItems(item.children) : '';
        
        itemXml = `
        <item identifier="${itemId}">
          <title>${item.title}</title>${childrenXml}
        </item>`;
      }
      
      itemsXml += itemXml;
    });
    
    return itemsXml;
  }
  
  // Generate the resources XML
  function generateResourcesXml() {
    let resourcesXml = '';
    
    resources.forEach(resource => {
      resourcesXml += `
        <resource identifier="${resource.id}" type="imsbasiclti_xmlv1p0">
            <file href="${resource.folderName}/basiclti.xml"/>
        </resource>`;
      
      // Create the folder and basiclti.xml file
      if (outputPath) {
        const folderPath = path.join(path.dirname(outputPath), resource.folderName);
        if (!fs.existsSync(folderPath)) {
          fs.mkdirSync(folderPath, { recursive: true });
        }
        
        // Generate the basiclti.xml content
        const basicLtiXml = generateBasicLtiXml(resource.launchUrl);
        fs.writeFileSync(path.join(folderPath, 'basiclti.xml'), basicLtiXml);
      }
    });
    
    return resourcesXml;
  }
  
  // Generate basiclti.xml content
  function generateBasicLtiXml(launchUrl) {
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
    <blti:title>External Tool</blti:title>
    <blti:description>Launch URL</blti:description>
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
  
  return xml;
}

module.exports = {
  generateManifest
}; 