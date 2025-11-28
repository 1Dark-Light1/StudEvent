/**
 * RegisterScreen collects the minimum onboarding data required to create a Firebase user.
 * It mirrors LoginScreen's look so users feel they are in the same flow, and centralises
 * validation, consent gating and profile enrichment (display name) in one place.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Platform, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialIcons, FontAwesome } from '@expo/vector-icons';
import Header from '../ui/Header';
import { auth } from '../../FireBaseConfig';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';

export default function Register({ navigation }) {
	const [firstName, setFirstName] = useState('');
	const [lastName, setLastName] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [confirm, setConfirm] = useState('');
	const [accept, setAccept] = useState(true);

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
		<LinearGradient colors={["#E9F1FF", "#F8FBFF"]} style={styles.container}>
			<Header />

			<View style={styles.card}>
				<Text style={styles.cardTitle}>Create a new account</Text>

				<IconInput
					icon={<Ionicons name="person-outline" size={20} color="#7A8BA3" />}
					placeholder="First name"
					value={firstName}
					onChangeText={setFirstName}
				/>
				<IconInput
					icon={<Ionicons name="person-outline" size={20} color="#7A8BA3" />}
					placeholder="Last name"
					value={lastName}
					onChangeText={setLastName}
				/>
				<IconInput
					icon={<MaterialIcons name="email" size={20} color="#7A8BA3" />}
					placeholder="Email"
					keyboardType="email-address"
					value={email}
					onChangeText={setEmail}
					autoCapitalize="none"
				/>
				<IconInput
					icon={<Ionicons name="lock-closed" size={20} color="#7A8BA3" />}
					placeholder="Password"
					secureTextEntry
					value={password}
					onChangeText={setPassword}
				/>
				<IconInput
					icon={<Ionicons name="lock-closed" size={20} color="#7A8BA3" />}
					placeholder="Confirm password"
					secureTextEntry
					value={confirm}
					onChangeText={setConfirm}
				/>

				<CheckboxRow checked={accept} onToggle={() => setAccept((v) => !v)} label="I accept the terms and conditions" />

				<Pressable style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }]} onPress={handleRegister}>
					<Text style={styles.primaryText}>Sign up</Text>
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
		</LinearGradient>
	);
}

/** Shared icon + input field used throughout the auth stack. */
function IconInput({ icon, style, ...props }) {
	return (
		<View style={[styles.inputWrap, style]}>
			<View style={styles.inputIcon}>{icon}</View>
			<TextInput placeholderTextColor="#9AA7B8" style={styles.input} {...props} />
		</View>
	);
}

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
		backgroundColor: '#F1F6FF',
		borderRadius: 16,
		paddingVertical: 18,
		paddingHorizontal: 14,
		marginTop: 18,
		...shadow(12),
	},
	cardTitle: {
		fontSize: 18,
		color: '#616E85',
		textAlign: 'center',
		marginBottom: 10,
	},
	inputWrap: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#fff',
		borderRadius: 10,
		paddingHorizontal: 10,
		paddingVertical: Platform.OS === 'ios' ? 14 : 10,
		marginVertical: 6,
		...shadow(8),
	},
	inputIcon: {
		width: 24,
		alignItems: 'center',
		marginRight: 8,
	},
	input: {
		flex: 1,
		fontSize: 15,
		color: '#1B2430',
	},
	checkboxRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 6,
		marginBottom: 10,
	},
	checkbox: {
		width: 20,
		height: 20,
		borderRadius: 4,
		borderWidth: 1,
		borderColor: '#6A95FF',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#fff',
	},
	checkboxChecked: {
		backgroundColor: '#3180FF',
		borderColor: '#3180FF',
	},
	checkboxLabel: {
		marginLeft: 8,
		color: '#3D4C66',
	},
	primaryBtn: {
		marginTop: 6,
		backgroundColor: '#2F7BFF',
		borderRadius: 12,
		paddingVertical: 14,
		alignItems: 'center',
		...shadow(10),
	},
	primaryText: {
		color: '#fff',
		fontWeight: '700',
		fontSize: 16,
	},
	miniText: {
		marginTop: 10,
		textAlign: 'center',
		color: '#7A8BA3',
	},
	link: {
		color: '#2F7BFF',
		fontWeight: '600',
	},
	socialRow: {
		flexDirection: 'row',
		gap: 18,
		marginTop: 24,
	},
	socialBtn: {
		width: 52,
		height: 52,
		borderRadius: 26,
		alignItems: 'center',
		justifyContent: 'center',
		...shadow(10),
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
