// Gaya kolom isian yang dipakai formulir akun. Dipisahkan dari komponennya
// karena formulir tambah dan formulir edit memakai gaya yang sama.
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

// Kolom yang tidak dapat diubah tetap harus terbaca. Warna teks bawaan MUI
// terlalu pucat, dan di Safari perlu WebkitTextFillColor.
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
