// Official fixed Barangay directory. Only these IDs may be used by the UI.
export const barangayDirectory = Object.freeze([
    { id: "brgy-01", name: "Barangay 1" },
    { id: "brgy-02", name: "Barangay 2" },
    { id: "brgy-03", name: "Barangay 3" },
    { id: "brgy-04", name: "Barangay 4" },
    { id: "brgy-05", name: "Barangay 5" },
    { id: "brgy-06", name: "Barangay 6" },
    { id: "brgy-07", name: "Barangay 7" },
    { id: "brgy-08", name: "Barangay 8" },
    { id: "brgy-09", name: "Barangay 9" },
    { id: "brgy-10", name: "Barangay 10" },
    { id: "brgy-11", name: "Barangay 11" },
    { id: "barra", name: "Barra" },
    { id: "bocohan", name: "Bocohan" },
    { id: "cotta", name: "Cotta" },
    { id: "dalahican", name: "Dalahican" },
    { id: "domoit", name: "Domoit" },
    { id: "gulang-gulang", name: "Gulang-gulang" },
    { id: "ibabang-dupay", name: "Ibabang Dupay" },
    { id: "ibabang-iyam", name: "Ibabang Iyam" },
    { id: "ibabang-talim", name: "Ibabang Talim" },
    { id: "ilayang-dupay", name: "Ilayang Dupay" },
    { id: "ilayang-iyam", name: "Ilayang Iyam" },
    { id: "ilayang-talim", name: "Ilayang Talim" },
    { id: "isabang", name: "Isabang" },
    { id: "market-view", name: "Market View" },
    { id: "mayao-castillo", name: "Mayao Castillo" },
    { id: "mayao-crossing", name: "Mayao Crossing" },
    { id: "mayao-kanluran", name: "Mayao Kanluran" },
    { id: "mayao-parada", name: "Mayao Parada" },
    { id: "mayao-silangan", name: "Mayao Silangan" },
    { id: "ransohan", name: "Ransohan" },
    { id: "salinas", name: "Salinas" },
    { id: "talao-talao", name: "Talao-talao" }
]);

export const barangayDirectoryById = new Map(
    barangayDirectory.map(
        (barangay) => [barangay.id, barangay]
    )
);
