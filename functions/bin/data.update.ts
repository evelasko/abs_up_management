import { equals, forEachObjIndexed, has, prop } from 'ramda'

import * as exercisesLocal from '../data/exercises.json'
import { db, exerciseCollection } from './admin'

//= Check and update remote data upon local data
const fetchAndCheck = async (
  localData: any,
  remoteData: FirebaseFirestore.QueryDocumentSnapshot<
    FirebaseFirestore.DocumentData
  >[]
) => {
  //= if the local data was not loaded the exit the script
  if (!localData) {
    return "script failed:\nlocal data could not be fetched...";
  }

  //= if there is no document from remote: rebuild
  //= the exercises collection
  if (!remoteData.length) {
    const _batch = db.batch();

    forEachObjIndexed((value, key) => {
      batch.set(exerciseCollection.doc(key), value);
    })(localData);

    try {
      await _batch.commit();
    } catch (e) {
      return `failed to commit the batch to firestore...\n${e}`;
    }

    return "successfully uploaded the entire local data to firestore";
  }

  //= extract remote document data to compare with local
  const remoteDocs = remoteData.reduce(
    (prev, curr) => Object.assign(prev, { [curr.id]: curr.data() }),
    {}
  );

  //= init batch
  const batch = db.batch();
  const jobs: string[] = [];

  //= perform check thru all local data object
  forEachObjIndexed(async (value, key) => {
    //= check if item is missing in remote
    if (!has(key as string, remoteDocs)) {
      jobs.push(`added: ${value.name}`);
      batch.set(exerciseCollection.doc(key as string), value);
    }

    //= if exists then check if needs update
    else if (!equals(value, prop(key as string)(remoteDocs))) {
      jobs.push(`updated: ${value.name}`);
      batch.update(exerciseCollection.doc(key as string), value);
    }
  }, localData);

  if (jobs.length) {
    await batch.commit();
    return jobs.join("\n") + "\n";
  }
  return "there was nothing to sync...\n";
};

//= Main function
const standard_input = process.stdin;
standard_input.setEncoding("utf-8");
console.log(`
************************************

Make sure that:
  1 - Numbers is open
  2 - the file data.source.numbers is open

then press enter
or type exit and press enter to cancel
************************************
`);
// When user input data and click enter key.
standard_input.on("data", function (data: string) {
  // User input exit.
  if (data === "exit\n") {
    // Program exit.
    console.log("user cancelled, program exits");
    process.exit();
  } else {
    // Print user input in console.
    console.log("\nprocessing...\n");

    // tslint:disable-next-line: no-floating-promises
    exerciseCollection.get().then((snapshot) => {
      console.log("remote data fetched!\n");
      const remoteData = snapshot.docs;
      // tslint:disable-next-line: no-floating-promises
      fetchAndCheck(exercisesLocal, remoteData).then((result) => {
        console.log(result);
        process.exit(0);
      });
    });
  }
});

// fetchLocalData().then((localData: any) => {
//   console.log("local data fetched!\n");
//   //= write the JSON base data file for flutter
//   fs.writeFileSync(
//     "/Users/potter/Developer/Projects/AbsApp/dev/abs_up/assets/data/exercises.json",
//     JSON.stringify(localData)
//   );
