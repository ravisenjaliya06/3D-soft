import styles from '@/components/inputfields/inputField.module.css';
import { assets } from '@/svgPaths';
import { IconButton, InputAdornment, TextField } from '@mui/material';

const InputField = ({
  label,
  smallField = false,
  mediumField = false,
  minField = false,
  type = 'text',
  showPassword = false,
  onClickShowPassword = () => {},
  onChange,
  borderColor,
  error,
  options = [{ value: '', label: '' }],
  ...props
}) => {
  return (
    <div className={styles.main}>
      {type === 'select' ? (
        <select className={styles.selectfielddata} onChange={onChange} {...props}>
          <option value="" disabled selected hidden>
            Select {label}
          </option>
          {options.map((option) => (
            <option key={option.value} value={option.label}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <>
          <TextField
            className={`${styles.textfielddata} ${minField ? styles.minField : ''}`}
            label={label}
            type={showPassword ? 'text' : type}
            variant="outlined"
            onChange={onChange}
            error={!!error}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  {type === 'password' && onClickShowPassword && (
                    <IconButton onClick={onClickShowPassword}>
                      {showPassword ? (
                        <img
                          src={assets.eye}
                          alt="Hide Password"
                          style={{
                            width: '1rem',
                            height: '1rem',
                          }}
                        />
                      ) : (
                        <img
                          src={assets.eye_off}
                          alt="Show Password"
                          style={{
                            width: '1rem',
                            height: '1rem',
                          }}
                        />
                      )}
                    </IconButton>
                  )}
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  border: `0.063rem solid ${error ? 'red' : borderColor} !important`,
                  borderRadius: '0.2rem !important',
                  padding: '0rem 0.4rem',
                },
                '&:hover fieldset': {
                  border: `0.063rem solid ${borderColor} !important`,
                },
                '&.Mui-focused fieldset': {
                  border: '0.063rem solid var(--primary-color-grey-2) !important',
                },
                '&.Mui-error fieldset': {
                  border: '0.063rem solid red !important',
                },
              },
              '& .MuiInputBase-input': {
                color: 'var(--primary-color)',
                padding: '0rem 0.5rem 0rem 0.7rem',
                height: '2.5rem',
                fontFamily: 'var(--font-family)',
                fontSize: '0.7rem',
                borderRadius: '0.3rem !important',
              },
              '& .MuiInputLabel-root': {
                color: error ? 'red' : 'var(--text-gray)',
                fontFamily: 'var(--font-family)',
                fontSize: '0.8rem',
                transform: 'translate(1rem, 0.6rem)',
                transition: 'all 0.2s ease-out',
              },
              '& .MuiInputLabel-root.Mui-focused, & .MuiInputLabel-root.MuiFormLabel-filled': {
                fontSize: '0.9rem',
                color: error ? 'red' : 'var(--text-gray)',
                transform: 'translate(0.6rem, -0.45rem) scale(0.7)',
              },
              '& .MuiInputBase-root': {
                width:
                  minField === true
                    ? '8.5rem !important'
                    : smallField === true
                      ? '11rem'
                      : mediumField === true
                        ? '18rem'
                        : '23rem',
                height: '2.5rem',
                padding: '0',
              },

              '& .MuiButtonBase-root': {
                padding: '0',
                marginRight: '1rem',
              },
              '& .css-w1u3ce': {
                width: 'auto',
                padding: '0',
              },
              '& .css-w1u3ce span': {
                padding: '0.1rem',
              },
              '& .MuiInputAdornment-root': {
                margin: '0',
              },
            }}
            {...props}
          />
          {error && <p className={styles.errorMessage}>{error}</p>}
        </>
      )}
    </div>
  );
};

export default InputField;
