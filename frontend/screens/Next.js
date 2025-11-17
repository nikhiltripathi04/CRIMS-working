import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    TouchableOpacity,
    Dimensions,
    SafeAreaView,
    Platform,
    StatusBar
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isIOS = Platform.OS === 'ios';
const isIPad = isIOS && Platform.isPad;

export default function NextScreen({ navigation, onComplete }) {
    const handleComplete = () => {
        // This marks onboarding as complete and updates the navigator
        onComplete();
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar
                barStyle="dark-content"
                backgroundColor="#FFFFFF"
            />
            <View style={styles.content}>
                <View style={styles.titleContainer}>
                    <Text style={styles.title}>From Bricks to Bulldozers – We Track It All.</Text>
                </View>

                <View style={styles.imageContainer}>
                    <View style={styles.imageWrapper}>
                        <Image
                            source={require('../assets/images/1.jpg')}
                            style={styles.image}
                        />
                    </View>
                </View>

                <View style={styles.descriptionContainer}>
                    <Text style={styles.description}>
                        Manage every item and equipment, big or small, with precision.
                    </Text>
                </View>

                <View style={styles.footer}>
                    {/* <TouchableOpacity onPress={handleComplete}>
                        <Text style={styles.skipText}>Skip</Text>
                    </TouchableOpacity> */}

                    <TouchableOpacity
                        style={styles.nextButton}
                        onPress={handleComplete}
                    >
                        <AntDesign name="arrowright" size={24} color="white" />
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF'
    },
    content: {
        flex: 1,
        paddingHorizontal: screenWidth * 0.05,
        // Adjust padding for iOS vs Android
        paddingTop: isIOS ? screenHeight * 0.02 : screenHeight * 0.025,
        paddingBottom: screenHeight * 0.04,
        alignItems: 'center',
        // Use flex-start for iOS to avoid strange spacing
        justifyContent: isIOS ? 'flex-start' : 'space-between'
    },
    titleContainer: {
        width: '100%',
        // Adjust margin for iOS
        marginTop: isIOS ? screenHeight * 0.08 : screenHeight * 0.05,
        alignItems: 'center'
    },
    title: {
        fontSize: isIPad ? screenWidth * 0.04 : screenWidth * 0.07,
        fontWeight: '700',
        color: '#000000',
        textAlign: 'center',
        // Remove the top margin that's causing the text to be too low on iOS
        marginTop: 0,
        fontFamily: 'Akatab',
        marginBottom: screenHeight * 0.03,
        // Add max width to ensure text stays properly contained
        maxWidth: '90%'
    },
    imageContainer: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        // Adjust margin for iOS
        marginTop: isIOS ? screenHeight * 0.04 : screenHeight * 0.02,
        marginBottom: screenHeight * 0.02
    },
    imageWrapper: {
        width: isIPad ? screenWidth * 0.6 : screenWidth * 0.65,
        // Use aspect ratio for height to maintain proportion
        aspectRatio: 1,
        backgroundColor: '#FFF',
        padding: screenWidth * 0.05,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3
    },
    image: {
        width: '100%',
        height: '100%',
        resizeMode: 'contain'
    },
    descriptionContainer: {
        width: '100%',
        // Adjust spacing for iOS
        marginTop: isIOS ? screenHeight * 0.04 : screenHeight * 0.025,
        marginBottom: isIOS ? screenHeight * 0.03 : screenHeight * 0.05,
        paddingHorizontal: screenWidth * 0.025,
        alignItems: 'center'
    },
    description: {
        fontSize: isIPad ? screenWidth * 0.025 : (isIOS ? screenWidth * 0.042 : screenWidth * 0.048),
        color: '#000000',
        textAlign: 'center',
        fontFamily: 'Akatab',
        fontWeight: '600',
        maxWidth: screenWidth * 0.85,
        // Fixed line height for iOS
        lineHeight: isIOS ? (isIPad ? 28 : 24) : (isIPad ? screenWidth * 0.035 : screenWidth * 0.068)
    },
    footer: {
        width: '90%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        // Position at the bottom for iOS
        position: isIOS ? 'absolute' : 'relative',
        bottom: isIOS ? screenHeight * 0.04 : undefined,
        marginTop: isIOS ? 0 : 'auto',
        marginBottom: isIOS ? 0 : screenHeight * 0.04
    },
    skipText: {
        fontSize: isIPad ? screenWidth * 0.02 : (isIOS ? screenWidth * 0.042 : screenWidth * 0.048),
        color: '#000',
        fontWeight: 'bold',
        fontFamily: 'Akatab'
    },
    nextButton: {
        // Fixed dimensions for iOS for consistency
        width: isIOS ? (isIPad ? 50 : 50) : (isIPad ? screenWidth * 0.06 : screenWidth * 0.134),
        height: isIOS ? (isIPad ? 50 : 50) : (isIPad ? screenWidth * 0.06 : screenWidth * 0.134),
        borderRadius: isIOS ? (isIPad ? 25 : 25) : (isIPad ? screenWidth * 0.03 : screenWidth * 0.067),
        backgroundColor: '#0088E0',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#0088E0',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5
    }
});