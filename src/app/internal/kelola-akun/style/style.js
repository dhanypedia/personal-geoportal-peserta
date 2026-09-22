// lib/styles/textFieldStyle.js
export const textFieldStyle = {
    "& .MuiInputBase-input": { color: "#1F2937" },
    "& .MuiInputLabel-root": { color: "#6B7280" },
    "& .MuiInputLabel-root.Mui-focused": { color: "#1976D2" },
    "& .MuiOutlinedInput-root": {
        "& fieldset": { borderColor: "#BFC5CC" },
        "&:hover fieldset": { borderColor: "#1976D2" },
        "&.Mui-focused fieldset": { borderColor: "#1976D2" },
    },
};

export const disabledFieldStyle = {
    ...textFieldStyle,
    "& .MuiInputBase-input.Mui-disabled": {
        color: "#1F2937",
        WebkitTextFillColor: "#1F2937",
    },
    "& .MuiInputLabel-root.Mui-disabled": { color: "#6B7280" },
    "& .MuiOutlinedInput-root.Mui-disabled .MuiOutlinedInput-notchedOutline": {
        borderColor: "#D1D5DB",
    },
};