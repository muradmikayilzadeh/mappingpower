import React, { useEffect, useState } from 'react';
import {
  FileLibraryListItem,
  ReactMediaLibraryRevived,
  FileMeta,
} from 'react-media-library-revived';

const ReactMediaLibraryWrapper = () => {
  const [display, setDisplay] = useState(false);
  const [fileLibraryList, setFileLibraryList] = useState([]);

  useEffect(() => {
    // TODO Get file list from database
    setFileLibraryList([
      {
        _id: 1,
        title: 'Cat 300x300',
        size: 294880,
        fileName: 'cat300.jpg',
        type: 'image/jpeg',
        createdAt: new Date('2022-10-17T03:12:29.866Z'),
        thumbnailUrl: 'https://www.shutterstock.com/image-photo/funny-large-longhair-gray-kitten-600nw-1842198919.jpg',
      },
      {
        _id: 2,
        title: 'Cat 500x500',
        size: 864483,
        fileName: 'cat500.jpg',
        type: 'image/jpeg',
        createdAt: new Date('2022-10-17T03:12:45.018Z'),
        thumbnailUrl: 'https://www.shutterstock.com/image-photo/funny-large-longhair-gray-kitten-600nw-1842198919.jpg',
      },
      {
        _id: 3,
        title: 'Cat 600x600',
        size: 586458,
        fileName: 'cat600.jpg',
        type: 'image/jpeg',
        createdAt: new Date('2022-10-17T03:19:33.498Z'),
        thumbnailUrl: 'https://www.shutterstock.com/image-photo/funny-large-longhair-gray-kitten-600nw-1842198919.jpg',
      },
      {
        _id: 4,
        title: 'Cat 800x800',
        size: 894665,
        fileName: 'photo-107.jpg',
        type: 'image/jpeg',
        createdAt: new Date('2022-10-17T03:28:39.723Z'),
        thumbnailUrl: 'https://www.shutterstock.com/image-photo/funny-large-longhair-gray-kitten-600nw-1842198919.jpg',
      },
    ]);
  }, []);

  async function uploadCallback(fileBase64, fileMeta) {
    // TODO Upload file to backend APIs
    const result = await fileUpload(fileBase64, fileMeta);

    if (result.success) {
      // New file uploaded
      // TODO Reacquire new file list from database
      const newFileList = await getNewFileList();
      setFileLibraryList(newFileList);

      // Return true to display upload success in modal
      return true;
    } else {
      // Return false to display upload failed in modal
      return false;
    }
  }

  function selectCallback(item) {
    // Hide modal
    setDisplay(false);

    // TODO Pass selected file back to client component callback function
    clientSelectCallback(item);
  }

  async function deleteCallback(item) {
    // TODO Delete file from backend service
    const result = await fileDelete(item);

    if (result.success) {
      // Deleted file
      // TODO Reacquire file list from database
      const newFileList = await getNewFileList();
      setFileLibraryList(newFileList);
    }
  }

  function tabChangeHandler(key) {
    // ...
  }

  return (
    <React.Fragment>
      <button
        onClick={() => {
          setDisplay(true);
        }}>
        Open React Media Library Revived
      </button>
      <ReactMediaLibraryRevived
        show={display}
        onHide={() => {
          setDisplay(false);
        }}
        fileUploadCallback={uploadCallback}
        fileLibraryList={fileLibraryList}
        fileSelectCallback={selectCallback}
        fileDeleteCallback={deleteCallback}
        tabChangeCallback={tabChangeHandler}
      />
    </React.Fragment>
  );
};

export default ReactMediaLibraryWrapper;
