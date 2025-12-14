/**
 * RegisterScreen collects the minimum onboarding data required to create a Firebase user.
 * It mirrors LoginScreen's look so users feel they are in the same flow, and centralises
 * validation, consent gating and profile enrichment (display name) in one place.
 */
import React, { useState, useEffect, useMemo, memo } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Platform, Alert, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialIcons, FontAwesome } from '@expo/vector-icons';
import Header from '../ui/Header';
import { auth } from '../../FireBaseConfig';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { saveUserData } from '../../services/userService';

// Cache images at module level to prevent reloading
const profileIcon = require('../../assets/Profile.png');
const emailIconReg = require('../../assets/email.png');
const lockIconReg = require('../../assets/lock.png');
const closedEyesIconReg = require('../../assets/closed-eyes.png');

export default function Register({ navigation }) {
	const [firstName, setFirstName] = useState('');
	const [lastName, setLastName] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [confirm, setConfirm] = useState('');
	const [accept, setAccept] = useState(true);
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);

	// Memoize icons to prevent re-creation on every render
	const profileIconElement = useMemo(
		() => <Image source={profileIcon} style={styles.inputImage} />,
		[]
	);
	const emailIconElement = useMemo(
		() => <Image source={emailIconReg} style={styles.inputImage} />,
		[]
	);
	const lockIconElement = useMemo(
		() => <Image source={lockIconReg} style={styles.inputImage} />,
		[]
	);

	// Prefetch images on mount
	useEffect(() => {
		const prefetchImages = async () => {
			try {
				await Image.prefetch(Image.resolveAssetSource(profileIcon).uri);
				await Image.prefetch(Image.resolveAssetSource(emailIconReg).uri);
				await Image.prefetch(Image.resolveAssetSource(lockIconReg).uri);
				await Image.prefetch(Image.resolveAssetSource(closedEyesIconReg).uri);
			} catch (e) {
				// Ignore prefetch errors
			}
		};
		prefetchImages();
	}, []);

	/**
	 * Performs basic validation, creates a Firebase user and stores the combined
	 * first/last name in displayName so the rest of the UI can greet the student.
	 */
	const handleRegister = async () => {
		// verification of acceptance of terms and conditions
		if (!accept) {
			Alert.alert('Registration', 'You must accept the terms of use.');
			return;
		}

		// basic field validation
		if (!email || !password || !confirm) {
			Alert.alert('Registration', 'Enter your email and password.');
			return;
		}

		if (password !== confirm) {
			Alert.alert('Registration', 'Passwords do not match.');
			return;
		}

		try {
			// Create a user in Firebase Auth
			const userCredential = await createUserWithEmailAndPassword(
				auth,
				email.trim(),
				password
			);

			// saving the first name/last name in displayName
			const fullName = `${firstName} ${lastName}`.trim();
			if (fullName) {
				await updateProfile(userCredential.user, { displayName: fullName });
			}

			// Сохраняем данные пользователя в Firestore
			try {
				await saveUserData({
					name: firstName.trim(),
					surname: lastName.trim(),
					email: email.trim(),
				});
			} catch (error) {
				console.error('Error saving user data to Firestore:', error);
				// Не прерываем регистрацию, если не удалось сохранить в Firestore
			}

			// message + transition to login screen
			Alert.alert('Success', 'You have successfully registered! Now log in to your account', [
				{
					text: 'OK',
					onPress: () => navigation.navigate('Login'),
				},
			]);
		} catch (error) {
			console.log('Register error:', error);
			Alert.alert('Registration error', error.message || 'Something went wrong.');
		}
	};

	return (
		<LinearGradient colors={["#BBCDE0", "#F7FCFE"]} style={styles.container}>
			<Header />

			<View style={styles.card}>
				<View style={styles.cardContent}>
					<Text style={styles.cardTitle}>Create a new account</Text>

					<IconInput
						icon={profileIconElement}
						placeholder="First name"
						value={firstName}
						onChangeText={setFirstName}
					/>
					<IconInput
						icon={profileIconElement}
						placeholder="Last name"
						value={lastName}
						onChangeText={setLastName}
					/>
					<IconInput
						icon={emailIconElement}
						placeholder="Email"
						keyboardType="email-address"
						value={email}
						onChangeText={setEmail}
						autoCapitalize="none"
					/>
					<PasswordInput
						icon={lockIconElement}
						placeholder="Password"
						value={password}
						onChangeText={setPassword}
						showPassword={showPassword}
						onTogglePassword={() => setShowPassword(!showPassword)}
					/>
					<PasswordInput
						icon={lockIconElement}
						placeholder="Confirm password"
						value={confirm}
						onChangeText={setConfirm}
						showPassword={showConfirmPassword}
						onTogglePassword={() => setShowConfirmPassword(!showConfirmPassword)}
					/>

					<CheckboxRow checked={accept} onToggle={() => setAccept((v) => !v)} label="I accept the terms and conditions" />

					<Pressable onPress={handleRegister} style={({ pressed }) => pressed && { opacity: 0.9 }}>
						<LinearGradient
							colors={['#2991FF', '#76B1F0']}
							style={styles.primaryBtn}
							start={{ x: 0, y: 0 }}
							end={{ x: 0, y: 1 }}
						>
							<Text style={styles.primaryText}>Sign up</Text>
						</LinearGradient>
					</Pressable>

					<Text style={styles.miniText}>
						Do you already have an account?{' '}
						<Text style={styles.link} onPress={() => navigation.navigate('Login')}>
							Log in
						</Text>
					</Text>
				</View>

				<View style={styles.socialRow}>
					<SocialIcon bg="#FFFFFF" onPress={() => { }}>
						<FontAwesome name="google" size={22} color="#DB4437" />
					</SocialIcon>
					<SocialIcon bg="#FFFFFF" onPress={() => { }}>
						<FontAwesome name="facebook" size={22} color="#1877F2" />
					</SocialIcon>
					<SocialIcon bg="#FFFFFF" onPress={() => { }}>
						<FontAwesome name="apple" size={24} color="#111" />
					</SocialIcon>
				</View>
			</View>
		</LinearGradient>
	);
}

// Memoize closed eyes icon element to prevent recreation
const ClosedEyesIconReg = memo(() => (
	<Image source={closedEyesIconReg} style={styles.inputImage} />
));

/** Shared icon + input field used throughout the auth stack. */
const IconInput = memo(function IconInput({ icon, style, ...props }) {
	return (
		<View style={[styles.inputWrap, style]}>
			<View style={styles.inputIcon}>{icon}</View>
			<TextInput placeholderTextColor="#9AA7B8" style={styles.input} {...props} />
			<View style={styles.eyeIcon} />
		</View>
	);
});

/** Password input with eye icon toggle for show/hide password. */
const PasswordInput = memo(function PasswordInput({ icon, showPassword, onTogglePassword, style, ...props }) {
	// Memoize eye icon to prevent recreation
	const eyeIconElement = useMemo(() => (
		showPassword ? (
			<Ionicons name="eye" size={20} color="#8F8F8F" />
		) : (
			<ClosedEyesIconReg />
		)
	), [showPassword]);

	return (
		<View style={[styles.inputWrap, style]}>
			<View style={styles.inputIcon}>{icon}</View>
			<TextInput
				placeholderTextColor="#9AA7B8"
				style={styles.input}
				secureTextEntry={!showPassword}
				{...props}
			/>
			<Pressable onPress={onTogglePassword} style={styles.eyeIcon}>
				{eyeIconElement}
			</Pressable>
		</View>
	);
});

/** Soft checkbox row for regulatory confirmations (terms, marketing, etc.). */
function CheckboxRow({ checked, onToggle, label }) {
	return (
		<Pressable style={styles.checkboxRow} onPress={onToggle} hitSlop={8}>
			<View style={[styles.checkbox, checked && styles.checkboxChecked]}>
				{checked && <Ionicons name="checkmark" size={14} color="#fff" />}
			</View>
			<Text style={styles.checkboxLabel}>{label}</Text>
		</Pressable>
	);
}

/**
 * Placeholder for future single-sign-on providers. Keeps layout predictable today
 * and makes adding Google/Facebook flows trivial later.
 */
function SocialIcon({ children, bg = '#fff', onPress }) {
	return (
		<Pressable style={({ pressed }) => [styles.socialBtn, { backgroundColor: bg }, pressed && { opacity: 0.9 }]} onPress={onPress}>
			{children}
		</Pressable>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		paddingTop: 64,
		paddingHorizontal: 24,
		alignItems: 'center',
	},
	header: { marginBottom: 16 },
	card: {
		width: '100%',
		height: '100%',
		backgroundColor: '#F2F7FB',
		borderRadius: 25,
		paddingVertical: 23,
		paddingHorizontal: 30,
		marginTop: 18,
		flexDirection: 'column',
		justifyContent: 'space-between',
	},
	cardContent: {
		flex: 1,
	},
	cardTitle: {
		fontSize: 22,
		fontWeight: '500',
		color: '#464646',
		textAlign: 'center',
		marginBottom: 15,
	},
	inputWrap: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#fff',
		borderRadius: 14,
		paddingHorizontal: 10,
		paddingVertical: Platform.OS === 'ios' ? 12 : 8,
		marginVertical: 8,
		minHeight: Platform.OS === 'ios' ? 46 : 42,
		...shadow(10),
	},
	inputIcon: {
		width: 24,
		alignItems: 'center',
		marginRight: 8,
		marginLeft: 5,
	},
	inputImage: {
		width: 20,
		height: 20,
		resizeMode: 'contain',
	},
	eyeIcon: {
		padding: 0,
		marginRight: 5,
		justifyContent: 'center',
		alignItems: 'center',
		width: 30,
		height: 30,
	},
	input: {
		flex: 1,
		fontSize: 16,
		fontWeight: '500',
		color: '#000000',
	},
	checkboxRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 12,
		marginBottom: 12,
	},
	checkbox: {
		width: 20,
		height: 20,
		borderRadius: 4,
		borderWidth: 1,
		borderColor: '#464646',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#fff',
	},
	checkboxChecked: {
		backgroundColor: '#464646',
		borderColor: '#464646',
	},
	checkboxLabel: {
		marginLeft: 8,
		fontWeight: '400',
		color: '#3D4C66',
	},
	primaryBtn: {
		marginTop: 6,
		borderRadius: 12,
		paddingVertical: 14,
		alignItems: 'center',
		...shadow(10),
	},
	primaryText: {
		color: '#fff',
		fontWeight: '700',
		fontSize: 18,
	},
	miniText: {
		marginTop: 14,
		fontWeight: '400',
		textAlign: 'center',
		color: '#7A8BA3',
	},
	link: {
		color: '#2F7BFF',
		fontWeight: '600',
	},
	socialRow: {
		flexDirection: 'row',
		gap: 28,
		justifyContent: 'center',
		marginBottom: 170,
	},
	socialBtn: {
		width: 52,
		height: 52,
		borderRadius: 26,
		alignItems: 'center',
		justifyContent: 'center',
	},
});

/** Platform shadow helper to keep cards consistent across OS versions. */
function shadow(elev = 8) {
	return Platform.select({
		ios: {
			shadowColor: '#000',
			shadowOpacity: 0.08,
			shadowRadius: elev / 2,
			shadowOffset: { width: 0, height: Math.ceil(elev / 3) },
		},
		android: {
			elevation: elev,
		},
		default: {},
	});
}
