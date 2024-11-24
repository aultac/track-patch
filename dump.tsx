import React from 'react';

const getVehicleIdFromResourceName = (resourceName) => {
  // Extract the vehicle ID (assumes it's the number before the first dash in the resource name)
  return resourceName.split(' - ')[0];
};

const generateTableData = (createdWorkOrders, knownWorkOrders, date, vehicleId) => {
  const mergedData = [];

  // Helper function to process each work order
  const processWorkOrder = (workOrder, source) => {
    if (
      workOrder["Work Date"] === date &&
      getVehicleIdFromResourceName(workOrder["Resource Name"]) === vehicleId
    ) {
      mergedData.push({
        routeRef: workOrder["Route (Ref)"] || "NA",
        inventoryAsset: workOrder["Inventory Asset"] || "NA",
        computedHours: source === "created" ? workOrder["computedHours"] || "NA" : "NA",
        reportedHours: workOrder["Total Hrs"] || "NA",
      });
    }
  };

  // Process known work orders
  knownWorkOrders.forEach((workOrder) => processWorkOrder(workOrder, "known"));

  // Process created work orders
  createdWorkOrders.forEach((workOrder) => processWorkOrder(workOrder, "created"));

  // Union inventory assets and fill missing data
  const inventorySet = new Set(mergedData.map((item) => item.inventoryAsset));
  const finalData = Array.from(inventorySet).map((inventoryAsset) => {
    const rowsForAsset = mergedData.filter(
      (item) => item.inventoryAsset === inventoryAsset
    );
    return {
      routeRef: rowsForAsset[0]?.routeRef || "NA",
      inventoryAsset: inventoryAsset,
      computedHours:
        rowsForAsset.find((item) => item.computedHours !== "NA")?.computedHours || "NA",
      reportedHours:
        rowsForAsset.find((item) => item.reportedHours !== "NA")?.reportedHours || "NA",
    };
  });

  return finalData;
};

const TableComponent = ({ createdWorkOrders, knownWorkOrders, date, vehicleId }) => {
  const tableData = generateTableData(createdWorkOrders, knownWorkOrders, date, vehicleId);

  return (
    <table border="1" style={{ borderCollapse: "collapse", width: "100%" }}>
      <thead>
        <tr>
          <th>Route Ref</th>
          <th>Inventory Asset</th>
          <th>Computed Hours</th>
          <th>Reported Hours</th>
        </tr>
      </thead>
      <tbody>
        {tableData.map((row, index) => (
          <tr key={index}>
            <td>{row.routeRef}</td>
            <td>{row.inventoryAsset}</td>
            <td>{row.computedHours}</td>
            <td>{row.reportedHours}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default TableComponent;
