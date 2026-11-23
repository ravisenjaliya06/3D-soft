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
        <select
          className={styles.selectfielddata}
          style={props.fullWidth ? { width: '100%', maxWidth: 'none' } : {}}
          onChange={onChange}
          {...props}
        >
          <option value="" disabled selected hidden>
            Select {label}
          </option>
          {options.map((option) => (
            <option key={option.value} value={option.label}>
              {option.label}
            </option>
          ))}
        </select>
      ) : type === 'file' ? (
        <div
          className={styles.fileInputContainer}
          style={props.fullWidth ? { maxWidth: 'none' } : {}}
        >
          <div className={`${styles.fileInputWrapper} ${props.value ? styles.hasFile : ''}`}>
            <label
              className={styles.fileInputLabel}
              onClick={() => props.onFocus && props.onFocus()}
              onMouseEnter={() => props.onFocus && props.onFocus()}
            >
              <div className={styles.fileInputContent}>
                <img src={assets.file} alt="upload" className={styles.uploadIcon} />
                <div className={styles.fileInfo}>
                  <span className={styles.labelText}>{label}</span>
                  <span className={styles.fileName}>
                    {props.value?.name || props.placeholder || 'Choose a file...'}
                  </span>
                </div>
              </div>
              <input
                type="file"
                className={styles.hiddenFileInput}
                onChange={onChange}
                {...props}
                value="" // Keep empty to allow re-selection of same file name
              />
            </label>
          </div>
          {error && <p className={styles.errorMessage}>{error}</p>}
        </div>
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
                  border: `0.063rem solid ${error ? 'var(--bv-danger)' : borderColor} !important`,
                  borderRadius: 'var(--bv-radius-sm) !important',
                  padding: '0rem 0.4rem',
                },
                '&:hover fieldset': {
                  border: `0.063rem solid ${borderColor} !important`,
                },
                '&.Mui-focused fieldset': {
                  border: '0.063rem solid var(--bv-primary) !important',
                },
                '&.Mui-error fieldset': {
                  border: '0.063rem solid var(--bv-danger) !important',
                },
              },
              '& .MuiInputBase-input': {
                color: 'var(--bv-text)',
                padding: '0rem 0.5rem 0rem 0.7rem',
                height: '2.8rem',
                fontFamily: 'var(--bv-font)',
                fontSize: '0.85rem',
                borderRadius: '0.4rem !important',
              },
              '& .MuiInputLabel-root': {
                color: error ? 'var(--bv-danger)' : 'var(--bv-text-subtle)',
                fontFamily: 'var(--bv-font)',
                fontSize: '0.8rem',
                transform: 'translate(1rem, 0.6rem)',
                transition: 'all 0.2s ease-out',
              },
              '& .MuiInputLabel-root.Mui-focused, & .MuiInputLabel-root.MuiFormLabel-filled': {
                fontSize: '0.9rem',
                color: error ? 'var(--bv-danger)' : 'var(--bv-text-subtle)',
                transform: 'translate(0.7rem, -0.4rem) scale(0.7)',
              },
              '& .MuiInputBase-root': {
                width: props.fullWidth
                  ? '100% !important'
                  : minField === true
                    ? '8.5rem !important'
                    : smallField === true
                      ? '11rem'
                      : mediumField === true
                        ? '18rem'
                        : '23rem',
                height: '2.8rem',
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
