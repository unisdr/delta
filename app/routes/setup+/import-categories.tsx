import {authActionWithPerm, authLoaderWithPerm} from "~/util/auth";
import { json, ActionFunction, LoaderFunction, } from "@remix-run/node";
import {parseCSV} from "~/util/csv"
import fs from 'fs/promises';

import {
	CategoryType,
	upsertRecord as upsertRecordCategory,
} from "~/backend.server/models/category";

import {
	SectorType,
	upsertRecord as upsertRecordSector,
  sectorById,
} from "~/backend.server/models/sector";

import { 
  useLoaderData, 
  Form, 
  redirect,
  useSubmit, 
  useNavigation,
  useActionData,
  useNavigate
} from "@remix-run/react";



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

export const loader = authLoaderWithPerm("EditData", async (actionArgs) => {

  return { 
    ok:'loader',
  };
});


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
  

  console.log( formData );

  return {
    ok: 'action', 
    message: importType == 'all' ? 'Category & sector imported' : importType == 'categories' ? 'Categories imported' : 'Sectors imported',
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
        </select>
        <button className="mg-button mg-button-primary" type="submit">Import</button>
      </Form>

    </div>
  );
}

