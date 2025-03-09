import {authActionWithPerm, authLoaderWithPerm} from "~/util/auth";
import {parseCSV} from "~/util/csv"
import fs from 'fs/promises';

import {
	CategoryType,
	upsertRecord as upsertRecordCategory,
} from "~/backend.server/models/category";

import {
	upsertRecord as upsertRecordAsset,
  assetByName,
} from "~/backend.server/models/asset";

import {AssetInsert as AssetType} from "~/drizzle/schema";


import {
	SectorType,
	upsertRecord as upsertRecordSector,
  sectorById,
} from "~/backend.server/models/sector";

import { 
  useLoaderData, 
  Form, 
  useActionData,
} from "@remix-run/react";
import { number } from "prop-types";



interface ActionData {
  ok?: string;
  error?: string;
  message?: string;
  form?:object;
}

type propsLoaderTypedResponse = { 
  ok: string; 
  content?: string;
};

export const loader = authLoaderWithPerm("EditData", async () => {

  return { 
    ok:'loader',
  };
});

// Define the type for dynamic assetImportData
interface interfaceAssetData {
  apiImportId?: string;
  id?: string;
  sectors: number[];
  name: string;
  category?: string;
  isBuiltIn?: boolean;
  nationalId?: string;
  notes?: string;
}


export const action = authActionWithPerm("EditData", async (actionArgs) => {
  let formData = await actionArgs.request.formData(); 
  const importType = formData.get('import');
  const currentDirectory = process.cwd;
  let filePath = currentDirectory();
  let fileString:string = '';
  
  if (importType === 'all' || importType === 'sectors') {
    filePath = filePath + '/app/hips/sectors2.csv'; // Replace with your file path
    try {
      fileString = await fs.readFile(filePath, 'utf8');
    } catch (error) {
      console.error('Error reading file:', error);
      throw new Response('File not found', { status: 404 });
    }

    let all = await parseCSV(fileString);
    // console.log( all );
    console.log( all[1] );

    let item = all[1];
    let formRecord:SectorType = { 
      id: parseInt(item[0]),
      parentId: parseInt(item[1]),
      sectorname: item[2],
      description: item[3],
    };
    let sectorRecord:any = {};

      for (const [key, item] of all.entries()) {
        if (key !== 0) {
          if (String(item[1]).length === 0) {
            formRecord = {
              id: parseInt(item[0]),
              sectorname: item[2],
              description: item[3],
              level: 1,
            };

            try {
              upsertRecordSector(formRecord).catch(console.error);
            } catch (e) {
              console.log(e);
              throw e;
            }
            // console.log(formRecord);
          } else {
            sectorRecord = await sectorById(parseInt(item[1]));
            if (sectorRecord) {
              
              formRecord = {
                id: parseInt(item[0]),
                parentId: parseInt(item[1]),
                sectorname: item[2],
                description: item[3],
                level: sectorRecord.level + 1,
              };

              try {
                upsertRecordSector(formRecord).catch(console.error);
              } catch (e) {
                console.log(e);
                throw e;
              }
              // console.log(formRecord);
            }
            
            
          }
        }
      }
  }

  if (importType === 'all' || importType === 'categories') {
    filePath = currentDirectory();
    filePath = filePath + '/app/hips/categories.csv'; // Replace with your file path
    
    try {
      fileString = await fs.readFile(filePath, 'utf8');
    } catch (error) {
      console.error('Error reading file:', error);
      throw new Response('File not found', { status: 404 });
    }

    let all = await parseCSV(fileString);
    // console.log( all );
    console.log( all[1] );
    let item = all[1];
    let formRecord:CategoryType = { 
      id: parseInt(item[0]),
      name: item[1],
    };
    // console.log(formRecord)
    // try {
    //     upsertRecord(formRecord).catch(console.error);
    //   } catch (e) {
    //     console.log(e);
    //     throw e;
    //   }
  
    all.forEach((item, key) => {
      if (key !== 0) {
      
        if (item[2] === '') {
          formRecord = { 
            id: parseInt(item[0]),
            name: item[1],
            level: parseInt(item[3]),
          };
        }
        else {
          formRecord = { 
            id: parseInt(item[0]),
            name: item[1],
            parentId: parseInt(item[2]),
            level: parseInt(item[3]),
          };
        }

        try {
            upsertRecordCategory(formRecord).catch(console.error);
            } catch (e) {
              console.log(e);
              throw e;
            }
      }
    }); 
  }

  if (importType === 'all' || importType === 'assets') {
    filePath = filePath + '/app/hips/assets.csv'; // Replace with your file path
    try {
      fileString = await fs.readFile(filePath, 'utf8');
    } catch (error) {
      console.error('Error reading file:', error);
      throw new Response('File not found', { status: 404 });
    }


    let all = await parseCSV(fileString);
    // console.log( all );
    console.log( all[1] );

    let item = all[1];
    let formRecord:AssetType = { 
      apiImportId: item[0],
      id: item[1],
      sectorIds: item[2],
      isBuiltIn: Boolean(item[3]),
      name: item[4],
      category: item[5],
      nationalId: item[6],
      notes: item[7],
    };
  
    // Use a dynamic object to store the assetImportData
    const assetImportData: { [key: string]: interfaceAssetData } = {};

    let xName:string = '';
    let xNameKey:string = '';
    let xSector:number = 0;

    // Example: Dynamically adding entries to the object
    function addAssetData(key: string, name: string, sectors: number[]) {
      assetImportData[key] = { name, sectors };
    }

    for (const [key, item] of all.entries()) {
      if (key !== 0) {
        xName = item[5].trim();
        xName = xName.charAt(0).toUpperCase() + xName.slice(1);
        xNameKey = xName.toLowerCase();
        xNameKey = xNameKey.replace(/[^a-zA-Z0-9]/g, '')
        
        xSector = Number(item[2]);

        if ( assetImportData[xNameKey] ) {
          if (!assetImportData[xNameKey].sectors.includes(xSector)) {
            assetImportData[xNameKey].sectors.push( xSector );
          }
        }
        else {
          addAssetData(xNameKey, xName, [xSector]);
          assetImportData[xNameKey].apiImportId = item[0];
          assetImportData[xNameKey].id = item[1];
          assetImportData[xNameKey].isBuiltIn = true;
          assetImportData[xNameKey].category = item[6];
          assetImportData[xNameKey].nationalId = item[7];
          assetImportData[xNameKey].notes = item[8];
        }

        // xAsset = await assetByName(item[5]);
        // if (xAsset) {
        //   console.log(key, item[5], xAsset);
        // }
        // else {
        //   console.log(key, item[5], 'DOESNT EXISTS');
        // }
        // try {
        //   upsertRecordAsset(formRecord).catch(console.error);
        // } catch (e) {
        //   console.log(e);
        //   throw e;
        // }
      }
    }
    
    for (const key in assetImportData) {
      if (assetImportData.hasOwnProperty(key)) {
        // console.log( `${assetImportData[key].name}` ); 
        // console.log( `${assetImportData[key].sectors.join(',')}` ); 

        // formRecord = {
        //   apiImportId: item[0],
        //   id: item[1],
        //   sectorIds: item[2],
        //   isBuiltIn: Boolean(item[4]),
        //   name: item[5],
        //   category: item[6],
        //   nationalId: item[7],
        //   notes: item[8],
        // };

        formRecord = {
          apiImportId: `${assetImportData[key].apiImportId}`,
          id: `${assetImportData[key].id}`,
          sectorIds: `${assetImportData[key].sectors.join(',')}`,
          isBuiltIn: true,
          name: `${assetImportData[key].name}`,
          category: `${assetImportData[key].category}`,
          nationalId: `${assetImportData[key].nationalId}`,
          notes: `${assetImportData[key].notes}`,
        };

        try {
          upsertRecordAsset(formRecord).catch(console.error);
        } catch (e) {
          console.log(e);
          throw e;
        }
      }
    }
    

    // console.log( assetImportData );
  }
  

  console.log( importType );

  return {
    ok: 'action', 
    message: importType == 'all' ? 'Categories, sectors & assets imported' : importType,
  }; 
});


export default function Index() {
  let loaderData = useLoaderData<propsLoaderTypedResponse>();
  const actionData = useActionData<ActionData>();

  console.log( loaderData );
  console.log( actionData );
  console.log("load...");

  return (
    <div>
      <h1>Import Categories and Sectors</h1>
      {
        actionData && actionData.ok === 'action' ? (
          <div>
            <p>{actionData.message}</p>
          </div>
        ) : ''
      }
      <Form method="post">
        <select name="import">
          <option value="all">Categories and sectors</option>
          <option value="categories">Categories</option>
          <option value="sectors">Sectors</option>
          <option value="assets">Assets</option>
        </select>
        <button className="mg-button mg-button-primary" type="submit">Import</button>
      </Form>

    </div>
  );
}

