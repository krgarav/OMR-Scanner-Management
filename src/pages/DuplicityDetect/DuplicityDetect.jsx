import React, { useState, useEffect, Fragment, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ImageNotFound from "../../components/ImageNotFound/ImageNotFound";
import { MdDelete } from "react-icons/md";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axios, { all } from "axios";
import { REACT_APP_IP } from "../../services/common";
import { Dialog, Transition } from "@headlessui/react";

const ImageScanner = () => {
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [duplicatesData, setDuplicatesData] = useState([]);
  const [showDuplicates, setShowDuplicates] = useState(true);
  const [showDuplicateField, setShowDuplicateField] = useState(false);
  const [columnName, setColumnName] = useState("");
  const [editModal, setEditModal] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [currentRowData, setCurrentRowData] = useState(null);
  const [allCurrentData, setAllCurrentData] = useState([]);
  const [sameDataIndex, setSameDataIndex] = useState(null);
  const [originalColumnValue, setOriginalColumnValue] = useState(null);
  const [imageUrl, setImageUrl] = useState("");
  const [modifiedKeys, setModifiedKeys] = useState({});
  const token = JSON.parse(localStorage.getItem("userData"));
  let { fileId } = JSON.parse(localStorage.getItem("fileId")) || "";
  let imageNames = JSON.parse(localStorage.getItem("imageName")) || "";
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(
          `http://${REACT_APP_IP}:4000/get/headerdata/${fileId}`,
          {
            headers: {
              token: token,
            },
          }
        );
        setCsvHeaders(response.data.headers);
      } catch (error) {
        console.log(error);
      }
    };
    fetchData();
  }, [fileId, token]);

  const onUpdateCurrentDataHandler = async () => {
    try {
      await axios.post(
        `http://${REACT_APP_IP}:4000/update/duplicatedata`,
        {
          index: currentRowData?.index,
          fileID: fileId,
          rowData: currentRowData.row,
          updatedColumn: modifiedKeys,
        },
        {
          headers: {
            token: token,
          },
        }
      );

      // Find the index of the group containing the currentRowData
      const indexToUpdate = duplicatesData.findIndex((group) =>
        group.sameData.some((item) => item.index === currentRowData.index)
      );

      // If the group is found
      if (indexToUpdate !== -1) {
        // Update the row data in the duplicatesData
        const updatedDuplicateData = duplicatesData.map((group, index) => {
          if (index === indexToUpdate) {
            return {
              sameData: group.sameData.map((item) =>
                item.index === currentRowData.index
                  ? { ...item, row: currentRowData.row }
                  : item
              ),
            };
          }
          return group;
        });

        // Update the row data in the allCurrentData
        const updatedAllCurrentData = allCurrentData.map((item) =>
          item.index === currentRowData.index
            ? { ...item, row: currentRowData.row }
            : item
        );

        // Check if originalColumnValue is null
        if (originalColumnValue !== null) {
          const filteredUpdatedDuplicateData = updatedDuplicateData.map(
            (group, index) => {
              if (index === sameDataIndex) {
                // Filter out the data where item.row[columnName] !== originalColumnValue
                const filteredSameData = group.sameData.filter((item) => {
                  console.log(
                    item.row[columnName] + " ==========" + originalColumnValue
                  );
                  return item.row[columnName] === originalColumnValue;
                });

                // Return the updated group with filtered sameData
                return {
                  sameData: filteredSameData,
                };
              }
              // Keep other groups unchanged
              return group;
            }
          );

          console.log(filteredUpdatedDuplicateData);

          const filteredAllCurrentData = updatedAllCurrentData.filter(
            (item) => item.row[columnName] === originalColumnValue
          );

          // Set the updated data in state
          setDuplicatesData(filteredUpdatedDuplicateData);
          setAllCurrentData(filteredAllCurrentData);
        } else {
          // Set the updated data in state without filtering
          setDuplicatesData(updatedDuplicateData);
          setAllCurrentData(updatedAllCurrentData);
        }
        setModifiedKeys(null);
        setOriginalColumnValue(null);
        toast.success("The row has been updated successfully.");
        setEditModal(false);
      }
    } catch (error) {
      toast.error("Unable to update the row data!");
    }
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "PageUp" && currentImageIndex > 0) {
        setCurrentImageIndex(currentImageIndex - 1);
        setImageUrl(currentRowData.base64Images[currentImageIndex - 1]);
      } else if (
        event.key === "PageDown" &&
        currentImageIndex < currentRowData?.base64Images.length - 1
      ) {
        setCurrentImageIndex(currentImageIndex + 1);
        setImageUrl(currentRowData.base64Images[currentImageIndex + 1]);
      } else if (event.altKey && event.key === "s") {
        // Ensure currentRowData is not null before updating
        if (currentRowData) {
          onUpdateCurrentDataHandler();
        } else {
          console.error("currentRowData is null when trying to update.");
        }
      } else if (event.key === "ArrowLeft") {
        if (editModal) {
          setEditModal(false);
        } else if (!showDuplicates) {
          setShowDuplicates(true);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [currentImageIndex, currentRowData, onUpdateCurrentDataHandler]);

  const changeCurrentCsvDataHandler = (key, newValue) => {
    if (key === columnName && originalColumnValue === null) {
      setOriginalColumnValue(currentRowData.row[key]);
    }
    setCurrentRowData((prevData) => ({
      ...prevData,
      row: {
        ...prevData.row,
        [key]: newValue,
      },
    }));

    setModifiedKeys((prevKeys) => {
      return {
        ...prevKeys,
        [key]: true,
      };
    });
  };

  const onFindDuplicatesHandler = async (columnName) => {
    try {
      const response = await axios.post(
        `http://${REACT_APP_IP}:4000/duplicate/data`,
        {
          colName: columnName,
          fileID: fileId,
          imageColumnName: imageNames,
        },
        {
          headers: {
            token: token,
          },
        }
      );

      if (response.data?.message) {
        toast.success(response.data?.message);
        return;
      }

      let groups = response.data.duplicates.reduce((acc, obj) => {
        let key = obj.row[columnName];
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(obj);
        return acc;
      }, {});

      let result = Object.values(groups).map((value) => {
        return { sameData: value };
      });

      setDuplicatesData(result);
      // setDuplicatesData(response.data.duplicates);
      const url = response.data?.duplicates[0].base64Images[currentImageIndex];
      setCurrentRowData(response.data?.duplicates[0]);
      setImageUrl(url);
      setColumnName(columnName);
      setShowDuplicates(false);
      toast.success("Successfully fetched all duplicates data!");
    } catch (error) {
      console.log(error);
      toast.warning(error.response?.data?.message);
    }
  };

  const onRemoveDuplicateHandler = async (index, rowIndex, colName) => {
    const currentData = [...allCurrentData];
    const allDuplicateData = [...duplicatesData];

    const filteredData = currentData.filter((item) => item.index !== rowIndex);

    function removeItemByRowIndex(dataArray, rowIndex) {
      return dataArray
        .map((group) => {
          return {
            sameData: group.sameData.filter((item) => item.index !== rowIndex),
          };
        })
        .filter((group) => group.sameData.length > 0);
    }
    const updatedData = removeItemByRowIndex(allDuplicateData, rowIndex);

    if (currentData.length === 1) {
      toast.warning("Removing the row is not permitted.");
      return;
    }

    try {
      await axios.post(
        `http://${REACT_APP_IP}:4000/delete/duplicate`,
        { index: parseInt(rowIndex), fileID: fileId },
        {
          headers: {
            token: token,
          },
        }
      );

      filteredData.forEach((data) => {
        if (data.index > rowIndex) {
          data.index -= 1;
        }
      });
      setAllCurrentData(filteredData);
      setDuplicatesData(updatedData);
      toast.success("Row Deleted successfully!");
    } catch (error) {
      console.log(error);
    }
  };

  const onEditModalHandler = (data, index) => {
    setCurrentRowData(data);
    setEditModal(true);
    setImageUrl(allCurrentData[index].base64Images[currentImageIndex]);
  };
  const onShowModalHandler = (data, index) => {
    setSameDataIndex(index);
    setAllCurrentData(data.sameData);
    setShowDuplicateField(true);
  };

  const onDuplicateCheckedHandler = () => {
    navigate(`/csvuploader/templatemap/${id}`);
  };

  return (
    <div className="flex duplicateImg  border-1 justify-center items-center pt-20">
      {showDuplicates ? (
        <div className="flex justify-center w-[100%]">
          <div className=" w-[800px]">
            {/* MAIN SECTION  */}
            <section className="mx-auto w-full max-w-7xl  px-12 py-6 bg-white rounded-xl">
              <div className="flex flex-col space-y-4  md:flex-row md:items-center md:justify-between md:space-y-0">
                <div>
                  <h2 className="text-3xl font-semibold">Find Duplicates</h2>
                </div>
              </div>
              <div className="mt-6 mb-4 flex flex-col w-full">
                <div className="mx-4 -my-2  sm:-mx-6 lg:-mx-8">
                  <div className="inline-block  py-2 align-middle md:px-6 lg:px-8">
                    <div className=" border border-gray-200 md:rounded-lg ">
                      <div className="divide-y divide-gray-200 ">
                        <div className="bg-gray-50">
                          <div className="flex justify-between items-center">
                            <div className="px-8 py-3.5 text-left text-xl font-semibold text-gray-700">
                              <span>Headers</span>
                            </div>
                          </div>
                        </div>
                        <div className="divide-y divide-gray-200 bg-white overflow-y-auto max-h-[300px] w-full">
                          {csvHeaders?.map((columnName, index) =>
                            columnName === "User Details" ||
                            columnName === "Updated Details" ? null : (
                              <div
                                key={index}
                                className="flex justify-between items-center"
                              >
                                <div className="whitespace-nowrap px-4 py-4">
                                  <div className="flex items-center">
                                    <div className="ml-4 w-full font-semibold">
                                      <div className="px-2">{columnName}</div>
                                    </div>
                                  </div>
                                </div>
                                <div className="whitespace-nowrap px-4 py-4 text-right">
                                  <button
                                    onClick={() =>
                                      onFindDuplicatesHandler(columnName)
                                    }
                                    className="rounded border border-indigo-500 bg-indigo-500 px-10 py-1 font-semibold text-white"
                                  >
                                    Check
                                  </button>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <button
                  onClick={onDuplicateCheckedHandler}
                  class="group inline-block rounded bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 p-[2px] hover:text-white focus:outline-none focus:ring active:text-opacity-75"
                >
                  <span class="block rounded-sm  px-8 py-3 text-sm font-medium group-hover:bg-transparent">
                    Complete
                  </span>
                </button>
              </div>
            </section>
          </div>
        </div>
      ) : (
        <>
          {/* LEFT SECTION  */}
          <div className="flex w-[25%] bg-red-100">
            <div className="text-center sm:block sm:p-0 w-full">
              {!editModal ? (
                <div className="inline-block align-bottom h-[91vh]  bg-teal-100  rounded-lg text-left shadow-md overflow-hidden transform transition-all  sm:align-middle  sm:w-full">
                  <div className="px-4">
                    <div className="sm:flex ">
                      <div className="text-center sm:mt-0  sm:text-left w-full">
                        <div className="flex justify-between mt-4 ">
                          <h1 className="text-xl font-bold text-gray-500 mb-6">
                            Duplicates : {duplicatesData.length}
                          </h1>
                          <h1 className="text-xl font-bold text-gray-500 mb-6">
                            Field : {columnName}
                          </h1>
                        </div>
                        <div className="text-gray-600 font-semibold my-2">
                          <dl className="-my-3 divide-y divide-gray-100 text-sm">
                            <div className="flex justify-around gap-1 py-3 text-center even:bg-gray-50 sm:grid-cols-4 sm:gap-4 w-full">
                              <dt className="font-medium text-md text-gray-700 w-1/3">
                                {columnName}
                              </dt>
                              <dd className="text-gray-700 font-medium  w-1/3">
                                Duplicates
                              </dd>
                              <dd className="text-gray-700 font-medium w-1/3">
                                View
                              </dd>
                            </div>
                          </dl>
                        </div>
                        <div className="text-gray-600 font-semibold my-2 overflow-y-auto h-[80vh] mt-7">
                          <dl className="-my-3 divide-y divide-gray-100 text-sm">
                            {duplicatesData?.map((data, index) => (
                              <div
                                key={index}
                                className="flex justify-around gap-1 py-3 text-center even:bg-gray-50 sm:grid-cols-4 "
                              >
                                <dt className="font-medium text-md text-gray-700 whitespace-normal">
                                  {data?.sameData[0]?.row[columnName]}
                                </dt>
                                <dd className="text-gray-700 font-medium ">
                                  {data.sameData.length}
                                </dd>

                                <div className="text-gray-700 ">
                                  <div className="relative">
                                    <div className="inline-flex items-center overflow-hidden rounded-md border bg-white">
                                      <button
                                        onClick={() =>
                                          onShowModalHandler(data, index)
                                        }
                                        className="border-e px-3 py-2 bg-blue-400 text-white text-sm/none  hover:bg-gray-50 hover:text-gray-700"
                                      >
                                        View
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    {showDuplicateField && (
                      <Transition.Root show={showDuplicateField}>
                        <Dialog
                          className="relative z-10"
                          onClose={setShowDuplicateField}
                        >
                          <Transition.Child
                            enter="ease-out duration-300"
                            enterFrom="opacity-0"
                            enterTo="opacity-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100"
                            leaveTo="opacity-0"
                          >
                            <div className="fixed inset-0 bg-gray-100 bg-opacity-5 transition-opacity" />
                          </Transition.Child>

                          <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
                            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                              <Transition.Child
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                                enterTo="opacity-100 translate-y-0 sm:scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                                leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                              >
                                <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                                  <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                                    <div className="sm:flex sm:items-start">
                                      <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                                        <Dialog.Title
                                          as="h2"
                                          className="text-xl mb-5 font-semibold leading-6 text-gray-900"
                                        >
                                          Roll
                                        </Dialog.Title>
                                        <div className="mt-2">
                                          <div className="min-w-full divide-y divide-gray-200">
                                            <div className="bg-gray-50 ">
                                              <div className="flex">
                                                <div className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                  {columnName}
                                                </div>
                                                <div className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                  Row Index
                                                </div>
                                                <div className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                  Edit
                                                </div>
                                                <div className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                  Remove
                                                </div>
                                              </div>
                                            </div>
                                            <div className="overflow-y-auto h-[400px]">
                                              {allCurrentData &&
                                                allCurrentData.map(
                                                  (data, index) => (
                                                    <div className="">
                                                      <div
                                                        key={index}
                                                        className={
                                                          index % 2 === 0
                                                            ? "bg-white flex-col"
                                                            : "bg-teal-100 flex-col"
                                                        }
                                                      >
                                                        <div className="flex">
                                                          <div className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                            {
                                                              data.row[
                                                                columnName
                                                              ]
                                                            }
                                                          </div>
                                                          <div className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                            {data.index}
                                                          </div>
                                                          <div className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            <button
                                                              onClick={() =>
                                                                onEditModalHandler(
                                                                  data,
                                                                  index
                                                                )
                                                              }
                                                              className="border-e px-3 bg-gray-100 py-2 text-sm/none text-gray-600 rounded hover:bg-gray-200 hover:text-gray-700"
                                                            >
                                                              Edit
                                                            </button>
                                                          </div>
                                                          <div
                                                            className="px-6 py-4 whitespace-nowrap text-red-500 text-2xl ml-8"
                                                            onClick={() =>
                                                              onRemoveDuplicateHandler(
                                                                index,
                                                                data.index,
                                                                data.row[
                                                                  columnName
                                                                ]
                                                              )
                                                            }
                                                          >
                                                            <MdDelete className="mx-auto" />
                                                          </div>
                                                        </div>
                                                      </div>
                                                    </div>
                                                  )
                                                )}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </Dialog.Panel>
                              </Transition.Child>
                            </div>
                          </div>
                        </Dialog>
                      </Transition.Root>
                    )}
                  </div>
                </div>
              ) : (
                <div className="inline-block align-bottom  bg-teal-100 rounded-lg text-left shadow-md transform transition-all  sm:align-middle md:max-w-xl sm:w-full">
                  <div className=" py-4 px-4">
                    <div className="sm:flex ">
                      <div className="text-center sm:mt-0 sm:ml-4 sm:text-left">
                        <div className="text-gray-600 font-semibold my-2 overflow-y-auto h-[80vh] mt-7">
                          <div className="divide-y divide-gray-100 text-sm">
                            <div>
                              {currentRowData &&
                                currentRowData.row &&
                                Object.entries(currentRowData.row).map(
                                  ([key, value], index) => {
                                    if (
                                      key === "User Details" ||
                                      key === "Updated Details"
                                    ) {
                                      return null;
                                    } else {
                                      return (
                                        <tr key={index}>
                                          <div className="py-2 px-2 text-center">
                                            {key.toUpperCase()}
                                          </div>
                                          <td className="py-2 p-2 px-2 text-center">
                                            <input
                                              className="text-center p-2"
                                              type="text"
                                              placeholder={value}
                                              value={value}
                                              onChange={(e) =>
                                                changeCurrentCsvDataHandler(
                                                  key,
                                                  e.target.value
                                                )
                                              }
                                            />
                                          </td>
                                        </tr>
                                      );
                                    }
                                  }
                                )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between px-7 py-2">
                    <button
                      onClick={() => setEditModal(false)}
                      class="group inline-block rounded bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 p-[2px] hover:text-white focus:outline-none focus:ring active:text-opacity-75"
                    >
                      <span class="block rounded-sm  px-8 py-2 text-md font-medium group-hover:bg-transparent">
                        Back
                      </span>
                    </button>
                    <button
                      onClick={onUpdateCurrentDataHandler}
                      class="group inline-block rounded bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 p-[2px] hover:text-white focus:outline-none focus:ring active:text-opacity-75"
                    >
                      <span class="block rounded-sm  px-8 py-2 text-md font-medium group-hover:bg-transparent">
                        Save
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT SECTION  */}
          {!imageUrl ? (
            <div className="flex w-[75%] justify-center items-center ">
              <div className="">
                <ImageNotFound />

                <h1 className="mt-8 text-2xl font-bold tracking-tight text-gray-700 sm:text-4xl">
                  Please Select Image...
                </h1>

                <p className="mt-4 text-gray-600 text-center">
                  We can't find that page!!
                </p>
              </div>
            </div>
          ) : (
            <div className=" w-[75%]">
              <div className="mx-auto max-w-screen-xl px-2 lg:py-1 sm:px-6 lg:px-8">
                <h2 className="text-center text-lg  font-bold text-blue-700 w-full ">
                  {currentImageIndex + 1} out of{" "}
                  {currentRowData?.base64Images.length}
                </h2>

                <div className=" flex justify-center ">
                  <div className="">
                    {imageUrl && (
                      <div
                        style={{
                          position: "relative",
                          border: "1px solid purple",
                        }}
                        className="w-full overflow-y-auto"
                      >
                        <img
                          src={`data:image/jpeg;base64,${imageUrl}`}
                          alt="Selected"
                          style={{
                            width: "48rem",
                            height: "49rem",
                          }}
                          draggable={false}
                          data-bs-toggle="modal"
                          data-bs-target="#exampleModal"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ImageScanner;
