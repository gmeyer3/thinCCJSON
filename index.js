// Save as convert-json-to-xml.js
import { js2xml } from 'xml-js';

// Complex JSON structure with elements and attributes
const json = {
  elements: [{
    type: 'element',
    name: 'root',
    attributes: {
      version: '1.0',
      encoding: 'UTF-8'
    },
    elements: [{
      type: 'element',
      name: 'customer',
      attributes: {
        id: 'C001',
        status: 'active'
      },
      elements: [{
        type: 'element',
        name: 'name',
        elements: [{
          type: 'text',
          text: 'John Doe'
        }]
      }, {
        type: 'element',
        name: 'address',
        attributes: {
          type: 'billing'
        },
        elements: [{
          type: 'text',
          text: '123 Main St, Anytown, USA'
        }]
      }, {
        type: 'element',
        name: 'orders',
        elements: [{
          type: 'element',
          name: 'order',
          attributes: {
            id: 'O123',
            date: '2025-03-01'
          },
          elements: [{
            type: 'element',
            name: 'item',
            attributes: {
              sku: 'ABC123',
              quantity: '2'
            },
            elements: [{
              type: 'text',
              text: 'Premium Widget'
            }]
          }]
        }]
      }]
    }]
  }]
};

// Convert JSON to XML with formatting options
const xml = js2xml(json, {
  compact: false,
  spaces: 2,
  fullTagEmptyElement: true,
  indentAttributes: true,
  indentCdata: true
});

console.log(xml);

// Export function for reuse in other modules
export const convertJsonToXml = (jsonData, options = {}) => {
  const defaultOptions = {
    compact: false,
    spaces: 2,
    fullTagEmptyElement: true
  };
  
  return js2xml(jsonData, { ...defaultOptions, ...options });
};

// Example usage in another file:
// import { convertJsonToXml } from './convert-json-to-xml.js';
// const myXml = convertJsonToXml(myJsonData);